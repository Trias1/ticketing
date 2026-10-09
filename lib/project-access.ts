import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "db";
import { projectMembers, projects } from "db/schema";
import { requireUser } from "lib/api-auth";
import { isUuid } from "lib/membership";

export type ProjectRole = "owner" | "member";

type Project = typeof projects.$inferSelect;
type CurrentUser = NonNullable<Awaited<ReturnType<typeof requireUser>>["user"]>;

type AccessResult =
  | { error: NextResponse; user: null; project: null; role: null }
  | { error: null; user: CurrentUser; project: Project; role: ProjectRole };

const fail = (message: string, status: number) => ({
  error: NextResponse.json({ message }, { status }),
  user: null,
  project: null,
  role: null,
});

export async function getMembership(projectId: string, userId: string) {
  return db.query.projectMembers.findFirst({
    where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)),
  });
}

// Akses project berbasis member. Project yang tidak bisa diakses dibalas 404 supaya keberadaannya tidak bocor.
export async function requireProjectAccess(
  projectId: string,
  { owner = false }: { owner?: boolean } = {}
): Promise<AccessResult> {
  const auth = await requireUser();
  if (auth.error) return { error: auth.error, user: null, project: null, role: null };
  // Admin hanya mengurus anggota & keamanan; project hanya untuk staff.
  if (auth.user.role !== "staff") return fail("Project not found", 404);
  if (!isUuid(projectId)) return fail("Project not found", 404);

  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project) return fail("Project not found", 404);

  const membership = await getMembership(project.id, auth.user.id);
  if (!membership) return fail("Project not found", 404);

  if (owner && membership.role !== "owner") {
    return fail("Only project owners can do this", 403);
  }

  return { error: null, user: auth.user, project, role: membership.role as ProjectRole };
}

// Versi untuk server component (halaman), berdasarkan team + slug di URL.
export async function findProjectForMember(team: string, slug: string, userId: string) {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.team, team), eq(projects.slug, slug)),
  });
  if (!project) return null;
  const membership = await getMembership(project.id, userId);
  if (!membership) return null;
  return { project, role: membership.role as ProjectRole };
}
