import { NextResponse } from "next/server";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "db";
import { projectLabels, tickets } from "db/schema";
import { requireProjectAccess } from "lib/project-access";
import { isUuid } from "lib/membership";

type Ctx = { params: Promise<{ projectId: string; labelId: string }> };
const HEX = /^#[0-9a-fA-F]{6}$/;

async function findLabel(projectId: string, labelId: string) {
  if (!isUuid(labelId)) return undefined;
  return db.query.projectLabels.findFirst({
    where: and(eq(projectLabels.id, labelId), eq(projectLabels.projectId, projectId)),
  });
}

// Ubah nama, warna, atau deskripsi label (semua member boleh).
export async function PATCH(req: Request, props: Ctx) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId);
  if (access.error) return access.error;

  const label = await findLabel(access.project.id, params.labelId);
  if (!label) return NextResponse.json({ message: "Label not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const patch: Partial<typeof projectLabels.$inferInsert> = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 50) {
      return NextResponse.json({ message: "Label name is required (max 50 characters)" }, { status: 400 });
    }
    const clash = await db.query.projectLabels.findFirst({
      where: and(
        eq(projectLabels.projectId, access.project.id),
        ne(projectLabels.id, label.id),
        sql`lower(${projectLabels.name}) = ${name.toLowerCase()}`
      ),
    });
    if (clash) return NextResponse.json({ message: "A label with this name already exists" }, { status: 409 });
    patch.name = name;
  }
  if (body.color !== undefined) {
    if (typeof body.color !== "string" || !HEX.test(body.color)) {
      return NextResponse.json({ message: "Invalid color" }, { status: 400 });
    }
    patch.color = body.color;
  }
  if (body.description !== undefined) {
    patch.description = typeof body.description === "string" ? body.description.trim().slice(0, 200) : null;
  }

  const [updated] = await db.update(projectLabels).set(patch).where(eq(projectLabels.id, label.id)).returning();
  return NextResponse.json(updated);
}

// Hapus label (khusus owner) dan lepaskan dari semua issue.
export async function DELETE(_req: Request, props: Ctx) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId, { owner: true });
  if (access.error) return access.error;

  const label = await findLabel(access.project.id, params.labelId);
  if (!label) return NextResponse.json({ message: "Label not found" }, { status: 404 });

  await db
    .update(tickets)
    .set({ labels: sql`array_remove(${tickets.labels}, ${label.id})` })
    .where(eq(tickets.projectId, access.project.id));
  await db.delete(projectLabels).where(eq(projectLabels.id, label.id));

  return NextResponse.json({ success: true });
}
