import { db } from "db";
import { users } from "db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { revokeSessions } from "lib/auth";
import { limitUser, requireSuperadmin } from "lib/api-auth";
import { logAuthEvent, requestMeta } from "lib/audit";
import { clientIp, userLimits } from "lib/rate-limit";
import { isUuid } from "lib/membership";
import { isSuperadmin } from "lib/roles";
import { otherActiveAdmin, teamExists } from "lib/teams";
import { DEMO_LOCKED_MESSAGE, isProtectedDemoAccount } from "lib/demo";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  // Hanya superadmin yang mengubah role & tim.
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;
  const currentUser = auth.user;
  const limited = await limitUser(userLimits.adminAction(currentUser.id));
  if (limited) return limited;

  try {
    const { role, team } = await request.json();

    const userId = params.id;
    if (!isUuid(userId)) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (userId === currentUser.id) {
      return NextResponse.json({ message: "You can't change your own role" }, { status: 400 });
    }
    // Hanya ada satu superadmin (pemilik aplikasi): role superadmin tidak bisa diberikan maupun
    // dicabut dari aplikasi. Yang bisa diubah: admin <-> user dan timnya.
    if (role !== "admin" && role !== "user") {
      return NextResponse.json({ message: "Role must be admin or user" }, { status: 400 });
    }
    if (!(await teamExists(team))) {
      return NextResponse.json({ message: "Invalid team" }, { status: 400 });
    }

    const before = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!before) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    if (isSuperadmin(before)) {
      return NextResponse.json({ message: "A superadmin's role can't be changed" }, { status: 400 });
    }
    if (isProtectedDemoAccount(before.email)) return NextResponse.json({ message: DEMO_LOCKED_MESSAGE }, { status: 403 });
    // Satu tim satu admin: tim tidak boleh dipakai bersama admin lain.
    if (role === "admin" && before.isActive !== false) {
      const other = await otherActiveAdmin(team, userId);
      if (other) {
        return NextResponse.json({ message: `This team already has an admin (${other})` }, { status: 400 });
      }
    }

    const updatedUser = await db
      .update(users)
      .set({ role, team, access: [] })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        team: users.team,
        access: users.access,
      });

    if (updatedUser.length === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (before.role !== role || before.team !== team) {
      await revokeSessions(userId);
      await logAuthEvent({ type: "role_changed", userId, actorId: currentUser.id, ...requestMeta(request.headers, clientIp(request.headers)) });
    }

    return NextResponse.json({
      message: "Role updated successfully",
      user: updatedUser[0],
    });
  } catch (error) {
    console.error("PATCH /users/[id]/role error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
