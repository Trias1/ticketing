import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "db";
import { ticketStatuses, tickets } from "db/schema";
import { requireProjectAccess } from "lib/project-access";
import { isUuid } from "lib/membership";

type Ctx = { params: Promise<{ projectId: string; statusId: string }> };

async function findStatus(projectId: string, statusId: string) {
  if (!isUuid(statusId)) return undefined;
  return db.query.ticketStatuses.findFirst({
    where: and(eq(ticketStatuses.id, statusId), eq(ticketStatuses.projectId, projectId)),
  });
}

// Ganti nama kolom (khusus owner).
export async function PATCH(req: Request, props: Ctx) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId, { owner: true });
  if (access.error) return access.error;

  const status = await findStatus(access.project.id, params.statusId);
  if (!status) return NextResponse.json({ message: "Column not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 50) {
    return NextResponse.json({ message: "Column name is required (max 50 characters)" }, { status: 400 });
  }

  const [updated] = await db.update(ticketStatuses).set({ name }).where(eq(ticketStatuses.id, status.id)).returning();
  return NextResponse.json(updated);
}

// Hapus kolom (khusus owner). Issue di kolom ini dipindah ke ?moveTo=<id kolom lain>.
export async function DELETE(req: Request, props: Ctx) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId, { owner: true });
  if (access.error) return access.error;

  const status = await findStatus(access.project.id, params.statusId);
  if (!status) return NextResponse.json({ message: "Column not found" }, { status: 404 });

  const [{ total }] = await db
    .select({ total: sql<number>`cast(count(*) as int)` })
    .from(ticketStatuses)
    .where(eq(ticketStatuses.projectId, access.project.id));
  if (total <= 1) {
    return NextResponse.json({ message: "A board needs at least one column" }, { status: 400 });
  }

  const [{ inUse }] = await db
    .select({ inUse: sql<number>`cast(count(*) as int)` })
    .from(tickets)
    .where(eq(tickets.statusId, status.id));

  const moveTo = new URL(req.url).searchParams.get("moveTo");
  let target = moveTo ? await findStatus(access.project.id, moveTo) : null;
  if (inUse > 0 && (!target || target.id === status.id)) {
    return NextResponse.json({ message: "Choose another column for the issues in this one" }, { status: 400 });
  }
  // Kolom kosong: tetap siapkan kolom cadangan, kalau-kalau ada issue yang dipindah ke sini barusan.
  if (!target || target.id === status.id) {
    [target] = await db
      .select()
      .from(ticketStatuses)
      .where(and(eq(ticketStatuses.projectId, access.project.id), sql`${ticketStatuses.id} <> ${status.id}`))
      .orderBy(ticketStatuses.order)
      .limit(1);
  }

  await db.batch([
    db.update(tickets).set({ statusId: target.id }).where(eq(tickets.statusId, status.id)),
    db.delete(ticketStatuses).where(eq(ticketStatuses.id, status.id)),
  ]);
  return NextResponse.json({ success: true });
}
