import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "db";
import { ticketStatuses } from "db/schema";
import { requireProjectAccess } from "lib/project-access";
import { isUuid } from "lib/membership";
import { ensureStatuses } from "lib/issues";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_req: Request, props: Ctx) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId);
  if (access.error) return access.error;
  return NextResponse.json(await ensureStatuses(access.project.id));
}

// Tambah kolom board (khusus owner).
export async function POST(req: Request, props: Ctx) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId, { owner: true });
  if (access.error) return access.error;

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 50) {
    return NextResponse.json({ message: "Column name is required (max 50 characters)" }, { status: 400 });
  }

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${ticketStatuses.order}), -1)` })
    .from(ticketStatuses)
    .where(eq(ticketStatuses.projectId, access.project.id));

  const [status] = await db
    .insert(ticketStatuses)
    .values({ projectId: access.project.id, name, order: Number(max) + 1 })
    .returning();
  return NextResponse.json(status, { status: 201 });
}

// Simpan urutan kolom: body { ids: string[] } (khusus owner).
export async function PUT(req: Request, props: Ctx) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId, { owner: true });
  if (access.error) return access.error;

  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter(isUuid) : [];

  await Promise.all(
    ids.map((id, order) =>
      db
        .update(ticketStatuses)
        .set({ order })
        .where(and(eq(ticketStatuses.id, id), eq(ticketStatuses.projectId, access.project.id)))
    )
  );
  return NextResponse.json({ success: true });
}
