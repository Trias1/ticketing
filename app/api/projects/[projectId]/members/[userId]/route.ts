import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "db";
import { projectMembers, tickets, users } from "db/schema";
import { getMembership, requireProjectAccess } from "lib/project-access";
import { isUuid } from "lib/membership";

type Ctx = { params: Promise<{ projectId: string; userId: string }> };

async function ownerCount(projectId: string) {
  const [row] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.role, "owner"), eq(users.isActive, true)));
  return row.n;
}

// Ganti peran member (khusus owner). Owner terakhir tidak bisa diturunkan.
export async function PATCH(req: Request, props: Ctx) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId, { owner: true });
  if (access.error) return access.error;

  const body = await req.json().catch(() => ({}));
  const role = body.role === "owner" ? "owner" : body.role === "member" ? "member" : null;
  if (!role) return NextResponse.json({ message: "Invalid role" }, { status: 400 });

  const target = isUuid(params.userId) ? await getMembership(access.project.id, params.userId) : undefined;
  if (!target) return NextResponse.json({ message: "Member not found" }, { status: 404 });

  if (target.role === "owner" && role === "member" && (await ownerCount(access.project.id)) <= 1) {
    return NextResponse.json({ message: "A project needs at least one owner" }, { status: 400 });
  }

  await db
    .update(projectMembers)
    .set({ role })
    .where(and(eq(projectMembers.projectId, access.project.id), eq(projectMembers.userId, params.userId)));

  return NextResponse.json({ success: true });
}

// Keluarkan member (owner), atau keluar sendiri dari project (member mana pun).
export async function DELETE(_req: Request, props: Ctx) {
  const params = await props.params;
  const leavingSelf = await requireProjectAccess(params.projectId);
  if (leavingSelf.error) return leavingSelf.error;

  const isSelf = leavingSelf.user.id === params.userId;
  if (!isSelf && leavingSelf.role !== "owner") {
    return NextResponse.json({ message: "Only project owners can do this" }, { status: 403 });
  }

  const target = isUuid(params.userId) ? await getMembership(leavingSelf.project.id, params.userId) : undefined;
  if (!target) return NextResponse.json({ message: "Member not found" }, { status: 404 });

  if (target.role === "owner" && (await ownerCount(leavingSelf.project.id)) <= 1) {
    return NextResponse.json({ message: "A project needs at least one owner" }, { status: 400 });
  }

  await db
    .delete(projectMembers)
    .where(and(eq(projectMembers.projectId, leavingSelf.project.id), eq(projectMembers.userId, params.userId)));

  // Issue yang di-assign ke member yang keluar dikosongkan assignee-nya.
  await db
    .update(tickets)
    .set({ assignedTo: null })
    .where(and(eq(tickets.projectId, leavingSelf.project.id), eq(tickets.assignedTo, params.userId)));

  return NextResponse.json({ success: true });
}
