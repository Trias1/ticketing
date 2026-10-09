import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "db";
import { projectMembers } from "db/schema";
import { requireProjectAccess } from "lib/project-access";

// Tandai / lepas bintang project untuk user yang sedang login.
export async function POST(req: Request, props: { params: Promise<{ projectId: string }> }) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId);
  if (access.error) return access.error;

  const body = await req.json().catch(() => ({}));
  const starred = body.starred === true;

  await db
    .update(projectMembers)
    .set({ starred })
    .where(and(eq(projectMembers.projectId, access.project.id), eq(projectMembers.userId, access.user.id)));

  return NextResponse.json({ starred });
}
