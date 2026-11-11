import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "db";
import { users } from "db/schema";
import { limitUser, requireSuperadmin, requireUser } from "lib/api-auth";
import { userLimits } from "lib/rate-limit";
import { isSuperadmin } from "lib/roles";
import { createTeam, listTeams } from "lib/teams";

export const dynamic = "force-dynamic";

// Daftar tim (slug + nama) untuk semua yang login, dipakai untuk menampilkan nama tim.
// Superadmin juga mendapat jumlah akun & admin per tim. Tidak ada data project (SOP).
export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const list = await listTeams();
  if (!isSuperadmin(auth.user)) return NextResponse.json(list);

  const counts = await db
    .select({
      team: users.team,
      members: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${users.isActive} is not false)::int`,
      admins: sql<number>`count(*) filter (where ${users.role} = 'admin' and ${users.isActive} is not false)::int`,
    })
    .from(users)
    .groupBy(users.team);
  const byTeam = new Map(counts.map((c) => [c.team, c]));

  return NextResponse.json(
    list.map((t) => ({
      ...t,
      members: byTeam.get(t.slug)?.members ?? 0,
      active: byTeam.get(t.slug)?.active ?? 0,
      admins: byTeam.get(t.slug)?.admins ?? 0,
    }))
  );
}

// Buat tim baru (superadmin).
export async function POST(req: Request) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;
  const limited = await limitUser(userLimits.adminAction(auth.user.id));
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const { team, error } = await createTeam(body?.name);
  if (error) return NextResponse.json({ message: error }, { status: 400 });
  return NextResponse.json(team, { status: 201 });
}
