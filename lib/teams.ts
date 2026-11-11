import slugify from "slugify";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "db";
import { teams, users } from "db/schema";
import { RESERVED_TEAM_SLUGS } from "lib/roles";

// Tim kerja (tabel teams). Slug dipakai di URL dan di users.team / projects.team, jadi tidak pernah
// berubah setelah dibuat; nama tim bisa diganti superadmin kapan saja.

export const TEAM_NAME_MAX = 50;

export async function listTeams() {
  return db.select({ slug: teams.slug, name: teams.name }).from(teams).orderBy(asc(teams.name));
}

export async function teamExists(slug: unknown) {
  if (typeof slug !== "string" || !slug) return false;
  return !!(await db.query.teams.findFirst({ where: eq(teams.slug, slug), columns: { slug: true } }));
}

const baseSlug = (name: string) =>
  slugify(name, { lower: true, strict: true }).slice(0, 36).replace(/-+$/, "") || "team";

// Satu tim hanya punya satu admin aktif, supaya tim tidak dipakai bersama. Kembalikan nama admin
// aktif lain di tim itu (selain exceptUserId), atau null kalau tim masih bebas.
export async function otherActiveAdmin(team: string, exceptUserId: string) {
  const other = await db.query.users.findFirst({
    where: and(eq(users.team, team), eq(users.role, "admin"), ne(users.id, exceptUserId), ne(users.isActive, false)),
    columns: { name: true },
  });
  return other?.name ?? null;
}

export function cleanTeamName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

async function nameTaken(name: string, exceptSlug?: string) {
  const rows = await db
    .select({ slug: teams.slug })
    .from(teams)
    .where(sql`lower(${teams.name}) = lower(${name})`);
  return rows.some((r) => r.slug !== exceptSlug);
}

// Masalah pada nama tim, atau null kalau boleh dipakai.
export async function teamNameProblem(name: string, exceptSlug?: string) {
  if (!name) return "Team name is required";
  if (name.length > TEAM_NAME_MAX) return `Team name can be at most ${TEAM_NAME_MAX} characters`;
  if (RESERVED_TEAM_SLUGS.has(baseSlug(name))) return "This name is reserved. Choose another team name.";
  if (await nameTaken(name, exceptSlug)) return "A team with this name already exists";
  return null;
}

// Buat tim baru; slug diturunkan dari nama dan dibuat unik. Kembalikan { team } atau { error }.
export async function createTeam(rawName: unknown) {
  const name = cleanTeamName(rawName);
  const problem = await teamNameProblem(name);
  if (problem) return { error: problem, team: null };

  const base = baseSlug(name);
  let slug = base;
  for (let n = 2; RESERVED_TEAM_SLUGS.has(slug) || (await teamExists(slug)); n++) slug = `${base}-${n}`;

  const [team] = await db.insert(teams).values({ slug, name }).returning({ slug: teams.slug, name: teams.name });
  return { error: null, team };
}
