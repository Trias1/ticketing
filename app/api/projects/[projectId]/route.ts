import { NextResponse } from "next/server";
import { and, asc, eq, ne } from "drizzle-orm";
import slugify from "slugify";
import { db } from "db";
import { projectLabels, projectMembers, projects, tickets, users } from "db/schema";
import { requireProjectAccess } from "lib/project-access";
import { ensureStatuses } from "lib/issues";

type Ctx = { params: Promise<{ projectId: string }> };
const HEX = /^#[0-9a-fA-F]{6}$/;

// Detail project untuk member: kolom board, label, dan member (dipakai semua tampilan issue).
export async function GET(_req: Request, props: Ctx) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId);
  if (access.error) return access.error;

  const [statuses, labels, members] = await Promise.all([
    ensureStatuses(access.project.id),
    db
      .select({ id: projectLabels.id, name: projectLabels.name, color: projectLabels.color, description: projectLabels.description })
      .from(projectLabels)
      .where(eq(projectLabels.projectId, access.project.id))
      .orderBy(asc(projectLabels.name)),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        team: users.team,
        role: projectMembers.role,
      })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(and(eq(projectMembers.projectId, access.project.id), eq(users.isActive, true)))
      .orderBy(asc(users.name)),
  ]);

  const me = await db.query.projectMembers.findFirst({
    where: and(eq(projectMembers.projectId, access.project.id), eq(projectMembers.userId, access.user.id)),
  });

  return NextResponse.json({
    project: access.project,
    role: access.role,
    starred: me?.starred ?? false,
    statuses,
    labels,
    members,
  });
}

// Ubah nama, deskripsi, warna, atau ikon (khusus owner).
export async function PATCH(req: Request, props: Ctx) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId, { owner: true });
  if (access.error) return access.error;

  const body = await req.json().catch(() => ({}));
  const patch: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 100) {
      return NextResponse.json({ message: "Project name is required (max 100 characters)" }, { status: 400 });
    }
    if (name !== access.project.name) {
      const baseSlug = slugify(name, { lower: true, strict: true }).slice(0, 80).replace(/-+$/, "") || "project";
      let slug = baseSlug;
      for (let n = 2; ; n++) {
        const taken = await db.query.projects.findFirst({
          where: and(eq(projects.slug, slug), eq(projects.team, access.project.team), ne(projects.id, access.project.id)),
        });
        if (!taken) break;
        slug = `${baseSlug}-${n}`;
      }
      patch.name = name;
      patch.slug = slug;
    }
  }
  if (body.description !== undefined) {
    patch.description = typeof body.description === "string" ? body.description.trim().slice(0, 500) : "";
  }
  if (body.color !== undefined) {
    if (typeof body.color !== "string" || !HEX.test(body.color)) {
      return NextResponse.json({ message: "Invalid color" }, { status: 400 });
    }
    patch.color = body.color;
  }
  if (body.icon !== undefined) {
    patch.icon = typeof body.icon === "string" ? body.icon.trim().slice(0, 16) || null : null;
  }

  const [project] = await db.update(projects).set(patch).where(eq(projects.id, access.project.id)).returning();
  return NextResponse.json({ project });
}

// Hapus project beserta issue-nya (khusus owner).
export async function DELETE(_req: Request, props: Ctx) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId, { owner: true });
  if (access.error) return access.error;

  // tickets.project_id memakai ON DELETE SET NULL, jadi issue dihapus dulu, dalam satu batch dengan project-nya.
  await db.batch([
    db.delete(tickets).where(eq(tickets.projectId, access.project.id)),
    db.delete(projects).where(eq(projects.id, access.project.id)),
  ]);
  return NextResponse.json({ success: true });
}
