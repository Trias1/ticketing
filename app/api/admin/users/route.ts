import { NextResponse } from "next/server";
import { db } from "db";
import { users } from "db/schema";
import { eq } from "drizzle-orm";
import { revokeSessions } from "lib/auth";
import { limitUser, requireAdmin } from "lib/api-auth";
import { logAuthEvent, requestMeta } from "lib/audit";
import { clientIp, userLimits } from "lib/rate-limit";
import { isUuid, onUserDeactivated, orphanWarning } from "lib/membership";

// =====================
// GET - Fetch all users
// =====================
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const allUsers = await db
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

  return NextResponse.json(allUsers);
}

// ===========================
// POST - Toggle Active Status
// ===========================
export async function POST(req: Request) {
  const auth = await requireAdmin();
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

  await db.update(users).set({ isActive }).where(eq(users.id, id));
  if (!isActive) {
    await revokeSessions(id);
    await logAuthEvent({ type: "user_deactivated", userId: id, actorId: currentUser.id, ...requestMeta(req.headers, clientIp(req.headers)) });
  }
  const orphaned = isActive ? [] : await onUserDeactivated(id);

  return NextResponse.json({ message: "User updated", warning: orphanWarning(orphaned) });
}
