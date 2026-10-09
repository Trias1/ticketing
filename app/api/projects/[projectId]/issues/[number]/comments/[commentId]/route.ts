import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "db";
import { ticketReplies } from "db/schema";
import { requireProjectAccess } from "lib/project-access";
import { findIssue } from "lib/issues";
import { isUuid } from "lib/membership";

type Ctx = { params: Promise<{ projectId: string; number: string; commentId: string }> };

async function load(params: Awaited<Ctx["params"]>) {
  const access = await requireProjectAccess(params.projectId);
  if (access.error) return { access, comment: null };
  const issue = await findIssue(access.project.id, Number(params.number));
  if (!issue || !isUuid(params.commentId)) return { access, comment: null };
  const comment = await db.query.ticketReplies.findFirst({
    where: and(eq(ticketReplies.id, params.commentId), eq(ticketReplies.ticketId, issue.id)),
  });
  return { access, comment: comment ?? null };
}

// Edit komentar sendiri.
export async function PATCH(req: Request, props: Ctx) {
  const params = await props.params;
  const { access, comment } = await load(params);
  if (access.error) return access.error;
  if (!comment) return NextResponse.json({ message: "Comment not found" }, { status: 404 });
  if (comment.userId !== access.user.id) {
    return NextResponse.json({ message: "You can only edit your own comments" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text || text.length > 10000) {
    return NextResponse.json({ message: "Comment can't be empty (max 10,000 characters)" }, { status: 400 });
  }

  await db.update(ticketReplies).set({ message: text }).where(eq(ticketReplies.id, comment.id));
  return NextResponse.json({ success: true });
}

// Hapus komentar: penulisnya atau owner project.
export async function DELETE(_req: Request, props: Ctx) {
  const params = await props.params;
  const { access, comment } = await load(params);
  if (access.error) return access.error;
  if (!comment) return NextResponse.json({ message: "Comment not found" }, { status: 404 });
  if (comment.userId !== access.user.id && access.role !== "owner") {
    return NextResponse.json({ message: "You can only delete your own comments" }, { status: 403 });
  }

  await db.delete(ticketReplies).where(eq(ticketReplies.id, comment.id));
  return NextResponse.json({ success: true });
}
