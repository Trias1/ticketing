import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "db";
import { projectMembers, projects, users } from "db/schema";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID_RE.test(value);

// Nomor issue valid: bilangan bulat positif yang muat di kolom integer Postgres.
export const isIssueNumber = (value: number) => Number.isInteger(value) && value >= 1 && value <= 2_147_483_647;

// Pastikan setiap project yang dimiliki user ini tetap punya owner aktif lain.
// Mengembalikan project yang tidak punya member aktif lain untuk dijadikan owner.
async function handOverOwnership(userId: string) {
  const orphaned: { id: string; name: string }[] = [];
  const owned = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(and(eq(projectMembers.userId, userId), eq(projectMembers.role, "owner")));

  for (const { projectId } of owned) {
    const [{ others }] = await db
      .select({ others: sql<number>`cast(count(*) as int)` })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.role, "owner"),
          ne(projectMembers.userId, userId),
          eq(users.isActive, true)
        )
      );
    if (others > 0) continue;

    // Tidak ada owner aktif lain: member aktif paling lama di project ini dijadikan owner.
    const [next] = await db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(and(eq(projectMembers.projectId, projectId), ne(projectMembers.userId, userId), eq(users.isActive, true)))
      .orderBy(asc(projectMembers.createdAt))
      .limit(1);
    if (next) {
      await db
        .update(projectMembers)
        .set({ role: "owner" })
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, next.userId)));
    } else {
      const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId), columns: { id: true, name: true } });
      if (project) orphaned.push(project);
    }
  }
  return orphaned;
}

export function orphanWarning(orphaned: { name: string }[]) {
  if (!orphaned.length) return undefined;
  const names = orphaned.map((p) => `"${p.name}"`).join(", ");
  return `No other active member could take over ${names}. Reactivate or restore this user to regain access.`;
}

// User dinonaktifkan: keanggotaan disimpan (untuk diaktifkan lagi), tapi kepemilikan project diserahkan.
export async function onUserDeactivated(userId: string) {
  return handOverOwnership(userId);
}
