import { db } from "db";
import { users } from "db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { revokeSessions } from "lib/auth";
import { limitUser, requireSuperadmin } from "lib/api-auth";
import { logAuthEvent, requestMeta } from "lib/audit";
import { clientIp, userLimits } from "lib/rate-limit";
import { isUuid, onUserLeftProjects, orphanWarning } from "lib/membership";
import { SUPERADMIN_TEAM, isRole, worksInProjects } from "lib/roles";
import { isProjectTeam } from "lib/team-access";

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
    if (!isRole(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }

    // Superadmin selalu di tim "superadmin"; admin & user di salah satu tim kerja.
    if (role === "superadmin" ? team !== SUPERADMIN_TEAM : !isProjectTeam(team)) {
      return NextResponse.json({ message: "Role and team do not match" }, { status: 400 });
    }

    const before = await db.query.users.findFirst({ where: eq(users.id, userId) });

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

    if (before && (before.role !== role || before.team !== team)) {
      await revokeSessions(userId);
      await logAuthEvent({ type: "role_changed", userId, actorId: currentUser.id, ...requestMeta(request.headers, clientIp(request.headers)) });
    }

    const orphaned = worksInProjects(before) && role === "superadmin" ? await onUserLeftProjects(userId) : [];

    return NextResponse.json({
      message: "Role updated successfully",
      warning: orphanWarning(orphaned),
      user: updatedUser[0],
    });
  } catch (error) {
    console.error("PATCH /users/[id]/role error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
