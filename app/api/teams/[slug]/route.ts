import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "db";
import { projects, teams, users } from "db/schema";
import { limitUser, requireSuperadmin } from "lib/api-auth";
import { userLimits } from "lib/rate-limit";
import { cleanTeamName, teamExists, teamNameProblem } from "lib/teams";

type Ctx = { params: Promise<{ slug: string }> };

const notFound = () => NextResponse.json({ message: "Team not found" }, { status: 404 });

// Ganti nama tim (superadmin). Slug tetap, jadi URL dan data akun/project tidak berubah.
export async function PATCH(req: Request, props: Ctx) {
  const { slug } = await props.params;
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;
  const limited = await limitUser(userLimits.adminAction(auth.user.id));
  if (limited) return limited;
  if (!(await teamExists(slug))) return notFound();

  const body = await req.json().catch(() => ({}));
  const name = cleanTeamName(body?.name);
  const problem = await teamNameProblem(name, slug);
  if (problem) return NextResponse.json({ message: problem }, { status: 400 });

  const [team] = await db.update(teams).set({ name }).where(eq(teams.slug, slug)).returning({ slug: teams.slug, name: teams.name });
  return NextResponse.json(team);
}

// Hapus tim yang sudah kosong: tanpa akun dan tanpa project.
export async function DELETE(_req: Request, props: Ctx) {
  const { slug } = await props.params;
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;
  const limited = await limitUser(userLimits.adminAction(auth.user.id));
  if (limited) return limited;
  if (!(await teamExists(slug))) return notFound();

  const member = await db.query.users.findFirst({ where: eq(users.team, slug), columns: { id: true } });
  const project = await db.query.projects.findFirst({ where: eq(projects.team, slug), columns: { id: true } });
  if (member || project) {
    return NextResponse.json(
      { message: "Only empty teams can be deleted: move its accounts to another team first. Teams with projects can't be deleted." },
      { status: 400 }
    );
  }

  await db.delete(teams).where(eq(teams.slug, slug));
  return NextResponse.json({ message: "Team deleted" });
}
