import { NextResponse } from "next/server";
import { db } from "db";
import { users } from "db/schema";
import { eq } from "drizzle-orm";
import { revokeSessions } from "lib/auth";
import { limitUser, requirePeopleManager } from "lib/api-auth";
import { logAuthEvent, requestMeta } from "lib/audit";
import { clientIp, userLimits } from "lib/rate-limit";
import { isUuid, onUserDeactivated, orphanWarning } from "lib/membership";
import { canManageAccount, isSuperadmin } from "lib/roles";

// =====================
// GET - Fetch users
// =====================
// Superadmin melihat semua akun; admin hanya akun di timnya sendiri.
export async function GET() {
  const auth = await requirePeopleManager();
  if (auth.error) return auth.error;
  const viewer = auth.user;

  const query = db
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
    })
    .from(users);
  const rows = isSuperadmin(viewer) ? await query : await query.where(eq(users.team, viewer.team));

  return NextResponse.json(
    rows.map((u) => ({ ...u, canManage: u.id !== viewer.id && canManageAccount(viewer, u) }))
  );
}

// ===========================
// POST - Toggle Active Status
// ===========================
export async function POST(req: Request) {
  const auth = await requirePeopleManager();
  if (auth.error) return auth.error;
  const currentUser = auth.user;
  const limited = await limitUser(userLimits.adminAction(currentUser.id));
  if (limited) return limited;

  const { id, isActive } = await req.json().catch(() => ({}));

  if (!isUuid(id) || typeof isActive !== "boolean") {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  if (id === currentUser.id && !isActive) {
    return NextResponse.json({ message: "You can't deactivate your own account" }, { status: 400 });
  }

  // Akun di luar wewenang dibalas 404, sama seperti akun yang tidak ada.
  const target = await db.query.users.findFirst({ where: eq(users.id, id), columns: { role: true, team: true } });
  if (!target || !canManageAccount(currentUser, target)) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  await db.update(users).set({ isActive }).where(eq(users.id, id));
  if (!isActive) {
    await revokeSessions(id);
    await logAuthEvent({ type: "user_deactivated", userId: id, actorId: currentUser.id, ...requestMeta(req.headers, clientIp(req.headers)) });
  }
  const orphaned = isActive ? [] : await onUserDeactivated(id);

  return NextResponse.json({ message: "User updated", warning: orphanWarning(orphaned) });
}
