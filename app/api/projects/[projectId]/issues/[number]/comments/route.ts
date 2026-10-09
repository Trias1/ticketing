import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "db";
import { ticketReplies, tickets } from "db/schema";
import { requireProjectAccess } from "lib/project-access";
import { limitUser } from "lib/api-auth";
import { userLimits } from "lib/rate-limit";
import { findIssue } from "lib/issues";

// Tambah komentar di issue (semua member).
export async function POST(req: Request, props: { params: Promise<{ projectId: string; number: string }> }) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId);
  if (access.error) return access.error;
  const limited = await limitUser(userLimits.comment(access.user.id));
  if (limited) return limited;

  const issue = await findIssue(access.project.id, Number(params.number));
  if (!issue) return NextResponse.json({ message: "Issue not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text || text.length > 10000) {
    return NextResponse.json({ message: "Comment can't be empty (max 10,000 characters)" }, { status: 400 });
  }

  const [comment] = await db
    .insert(ticketReplies)
    .values({ ticketId: issue.id, userId: access.user.id, message: text })
    .returning();
  await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, issue.id));

  return NextResponse.json(comment, { status: 201 });
}
