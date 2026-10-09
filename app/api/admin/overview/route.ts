import { NextResponse } from "next/server";
import { db } from "db";
import { users } from "db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "lib/api-auth";

export const dynamic = "force-dynamic";

// Heartbeat dikirim tiap 30 detik, jadi "online" = aktivitas dalam 1 menit terakhir.
const ONLINE_WINDOW_MS = 60 * 1000;
// Akun aktif yang tidak login selama ini dianggap "dormant".
const DORMANT_DAYS = 30;
const TEAMS = ["admin", "cloud", "devops", "pm"] as const;

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        team: users.team,
        access: users.access,
        isActive: users.isActive,
        avatarUrl: users.avatarUrl,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    const now = Date.now();
    const dormantBefore = now - DORMANT_DAYS * 24 * 60 * 60 * 1000;
    const all = rows.map((u) => ({
      ...u,
      isActive: u.isActive !== false,
      online: !!u.lastLoginAt && now - new Date(u.lastLoginAt).getTime() < ONLINE_WINDOW_MS,
    }));

    const active = all.filter((u) => u.isActive);
    const blocked = all.filter((u) => !u.isActive);
    const admins = all.filter((u) => u.role === "admin");
    const neverLoggedIn = active.filter((u) => !u.lastLoginAt);
    const dormant = active.filter(
      (u) => u.lastLoginAt && new Date(u.lastLoginAt).getTime() < dormantBefore
    );
    const seedAccounts = active.filter((u) => u.email.toLowerCase().endsWith("@example.com"));

    // Temuan keamanan, diurutkan dari yang paling penting.
    const findings = [
      seedAccounts.length > 0 && {
        id: "seed",
        severity: "high",
        title: "Default seed account is still active",
        description: "Sample accounts created by the seed script usually use a default password. Deactivate it or change its password.",
        users: seedAccounts,
      },
      admins.length > 3 && {
        id: "admins",
        severity: "medium",
        title: `${admins.length} accounts have the admin role`,
        description: "Keep admins to a minimum. Every admin can change roles and deactivate other users.",
        users: admins,
      },
      dormant.length > 0 && {
        id: "dormant",
        severity: "medium",
        title: `No sign-in for more than ${DORMANT_DAYS} days`,
        description: "Active accounts that are no longer used should be deactivated.",
        users: dormant,
      },
      neverLoggedIn.length > 0 && {
        id: "never",
        severity: "low",
        title: "Never signed in",
        description: "Make sure the owner received their access, or remove the account if it is not needed.",
        users: neverLoggedIn,
      },
    ].filter(Boolean);

    return NextResponse.json({
      generatedAt: new Date(now).toISOString(),
      counts: {
        users: all.length,
        active: active.length,
        blocked: blocked.length,
        admins: admins.length,
        online: all.filter((u) => u.online).length,
        neverLoggedIn: neverLoggedIn.length,
        dormant: dormant.length,
      },
      teams: TEAMS.map((team) => {
        const members = all.filter((u) => u.team === team);
        return {
          team,
          members: members.length,
          active: members.filter((u) => u.isActive).length,
          online: members.filter((u) => u.online).length,
        };
      }),
      findings,
      latestUsers: all.slice(0, 6),
      recentLogins: all
        .filter((u) => u.lastLoginAt)
        .sort((a, b) => new Date(b.lastLoginAt!).getTime() - new Date(a.lastLoginAt!).getTime())
        .slice(0, 6),
      admins,
      blocked,
    });
  } catch (error) {
    console.error("GET /api/admin/overview error:", error);
    return NextResponse.json({ message: "Failed to load overview" }, { status: 500 });
  }
}
