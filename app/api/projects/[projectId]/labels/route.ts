import { NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "db";
import { projectLabels } from "db/schema";
import { requireProjectAccess } from "lib/project-access";

type Ctx = { params: Promise<{ projectId: string }> };
const HEX = /^#[0-9a-fA-F]{6}$/;

// Label project beserta jumlah issue open yang memakainya.
export async function GET(_req: Request, props: Ctx) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId);
  if (access.error) return access.error;

  const labels = await db
    .select({
      id: projectLabels.id,
      name: projectLabels.name,
      color: projectLabels.color,
      description: projectLabels.description,
      // Kolom ditulis lengkap dengan nama tabel: di query satu tabel Drizzle tidak menambahkannya,
      // sehingga "id" di dalam subquery akan terbaca sebagai tickets.id.
      openIssues: sql<number>`cast((select count(*) from "tickets" t where t."project_id" = "project_labels"."project_id" and t."closed_at" is null and "project_labels"."id"::text = ANY(t."labels")) as int)`,
    })
    .from(projectLabels)
    .where(eq(projectLabels.projectId, access.project.id))
    .orderBy(asc(projectLabels.name));

  return NextResponse.json(labels);
}

// Buat label baru (semua member boleh).
export async function POST(req: Request, props: Ctx) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId);
  if (access.error) return access.error;

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const color = typeof body.color === "string" && HEX.test(body.color) ? body.color : "#71717a";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 200) : null;

  if (!name || name.length > 50) {
    return NextResponse.json({ message: "Label name is required (max 50 characters)" }, { status: 400 });
  }
  const exists = await db.query.projectLabels.findFirst({
    where: and(eq(projectLabels.projectId, access.project.id), sql`lower(${projectLabels.name}) = ${name.toLowerCase()}`),
  });
  if (exists) return NextResponse.json({ message: "A label with this name already exists" }, { status: 409 });

  const [label] = await db
    .insert(projectLabels)
    .values({ projectId: access.project.id, name, color, description })
    .returning();
  return NextResponse.json(label, { status: 201 });
}
