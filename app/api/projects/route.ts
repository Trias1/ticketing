import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import slugify from "slugify";
import { db } from "db";
import { projectLabels, projectMembers, projects, ticketStatuses } from "db/schema";
import { limitUser, requireUser } from "lib/api-auth";
import { userLimits } from "lib/rate-limit";
import { canCreateProjectForTeam, isProjectTeam } from "lib/team-access";
import { DEFAULT_LABELS, DEFAULT_STATUSES } from "lib/issues";

const HEX = /^#[0-9a-fA-F]{6}$/;

// Buat project baru: pembuat otomatis jadi owner, kolom board & label default ikut dibuat.
export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  if (auth.user.role === "admin") {
    return NextResponse.json({ message: "Admins don't own projects" }, { status: 403 });
  }
  const limited = await limitUser(userLimits.project(auth.user.id));
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const team = typeof body.team === "string" ? body.team : auth.user.team;
  const color = typeof body.color === "string" && HEX.test(body.color) ? body.color : "#0f766e";
  const icon = typeof body.icon === "string" ? body.icon.trim().slice(0, 16) || null : null;

  if (!name || name.length > 100) {
    return NextResponse.json({ message: "Project name is required (max 100 characters)" }, { status: 400 });
  }
  if (!isProjectTeam(team) || !canCreateProjectForTeam(auth.user, team)) {
    return NextResponse.json({ message: "You can't create projects for this team" }, { status: 403 });
  }

  const baseSlug = slugify(name, { lower: true, strict: true }).slice(0, 80).replace(/-+$/, "") || "project";
  let slug = baseSlug;
  for (let n = 2; ; n++) {
    const taken = await db.query.projects.findFirst({
      where: and(eq(projects.slug, slug), eq(projects.team, team)),
    });
    if (!taken) break;
    slug = `${baseSlug}-${n}`;
  }

  try {
    const projectId = crypto.randomUUID();
    // Satu batch = satu transaksi: project tidak mungkin tersimpan tanpa owner.
    const [[project]] = await db.batch([
      db
        .insert(projects)
        .values({ id: projectId, name, slug, description, team, color, icon, createdBy: auth.user.id, updatedAt: new Date() })
        .returning(),
      db.insert(projectMembers).values({ projectId, userId: auth.user.id, role: "owner" }),
      db.insert(ticketStatuses).values(DEFAULT_STATUSES.map((s, order) => ({ projectId, name: s, order }))),
      db.insert(projectLabels).values(DEFAULT_LABELS.map((l) => ({ projectId, ...l }))),
    ]);

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ message: "Failed to create project" }, { status: 500 });
  }
}
