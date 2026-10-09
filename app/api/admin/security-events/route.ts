import { NextResponse } from "next/server";
import { and, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "db";
import { authEvents, users } from "db/schema";
import { requireAdmin } from "lib/api-auth";

export const dynamic = "force-dynamic";

const GROUPS: Record<string, string[]> = {
  attention: ["login_failed", "login_blocked", "login_disabled", "token_reuse"],
  signins: ["login_success", "logout"],
  account: ["password_changed", "password_reset", "email_changed", "user_deactivated", "role_changed"],
};

// Log keamanan untuk admin: ringkasan 24 jam + 100 kejadian terbaru (opsional per kelompok).
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const group = new URL(req.url).searchParams.get("group") ?? "all";
  const types = GROUPS[group];
  const actor = alias(users, "actor");
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [events, [summary]] = await Promise.all([
    db
      .select({
        id: authEvents.id,
        type: authEvents.type,
        email: authEvents.email,
        ip: authEvents.ip,
        userAgent: authEvents.userAgent,
        createdAt: authEvents.createdAt,
        userName: users.name,
        userEmail: users.email,
        actorName: actor.name,
      })
      .from(authEvents)
      // Login gagal hanya mencatat email; cocokkan juga lewat email supaya nama akunnya tampil.
      .leftJoin(
        users,
        or(eq(users.id, authEvents.userId), and(isNull(authEvents.userId), sql`lower(${users.email}) = ${authEvents.email}`))
      )
      .leftJoin(actor, eq(actor.id, authEvents.actorId))
      .where(types ? inArray(authEvents.type, types) : undefined)
      .orderBy(desc(authEvents.createdAt))
      .limit(100),
    db
      .select({
        failed: sql<number>`cast(count(*) filter (where ${authEvents.type} = 'login_failed' and ${authEvents.createdAt} >= ${since24h}) as int)`,
        blocked: sql<number>`cast(count(*) filter (where ${authEvents.type} = 'login_blocked' and ${authEvents.createdAt} >= ${since24h}) as int)`,
        signins: sql<number>`cast(count(*) filter (where ${authEvents.type} = 'login_success' and ${authEvents.createdAt} >= ${since24h}) as int)`,
        ips: sql<number>`cast(count(distinct ${authEvents.ip}) filter (where ${authEvents.createdAt} >= ${since24h}) as int)`,
        reuse: sql<number>`cast(count(*) filter (where ${authEvents.type} = 'token_reuse') as int)`,
      })
      .from(authEvents)
      .where(and(gte(authEvents.createdAt, since7d))),
  ]);

  return NextResponse.json(
    { summary, events },
    { headers: { "Cache-Control": "no-store" } }
  );
}
