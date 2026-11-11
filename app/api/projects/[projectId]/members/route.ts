import { NextResponse } from "next/server";
import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "db";
import { projectMembers, users } from "db/schema";
import { requireProjectAccess } from "lib/project-access";
import { isUuid } from "lib/membership";
import { worksInProjects } from "lib/roles";

type Ctx = { params: Promise<{ projectId: string }> };

// Daftar member; owner juga mendapat daftar admin & user aktif yang bisa diundang.
export async function GET(_req: Request, props: Ctx) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId);
  if (access.error) return access.error;

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      team: users.team,
      role: projectMembers.role,
      isActive: users.isActive,
      joinedAt: projectMembers.createdAt,
    })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .where(eq(projectMembers.projectId, access.project.id))
    .orderBy(asc(users.name));

  let candidates: { id: string; name: string; email: string; team: string; avatarUrl: string | null }[] = [];
  if (access.role === "owner") {
    candidates = await db
      .select({ id: users.id, name: users.name, email: users.email, team: users.team, avatarUrl: users.avatarUrl })
      .from(users)
      .where(
        and(
          inArray(users.role, ["admin", "user"]),
          eq(users.isActive, true),
          members.length ? notInArray(users.id, members.map((m) => m.id)) : undefined
        )
      )
      .orderBy(asc(users.name));
  }

  return NextResponse.json({ members, candidates, role: access.role });
}

// Tambah member (khusus owner). Hanya admin/user aktif yang bisa ditambahkan (superadmin tidak bekerja di project).
export async function POST(req: Request, props: Ctx) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId, { owner: true });
  if (access.error) return access.error;

  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  const role = body.role === "owner" ? "owner" : "member";

  const user = isUuid(userId) ? await db.query.users.findFirst({ where: eq(users.id, userId) }) : null;
  if (!user || !worksInProjects(user) || user.isActive === false) {
    return NextResponse.json({ message: "Only active admins and users can be added" }, { status: 400 });
  }

  await db
    .insert(projectMembers)
    .values({ projectId: access.project.id, userId, role })
    .onConflictDoNothing();

  return NextResponse.json({ success: true }, { status: 201 });
}
