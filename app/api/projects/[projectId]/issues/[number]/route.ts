import { NextResponse } from "next/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "db";
import { activity, projectLabels, projectMembers, ticketReplies, ticketStatuses, tickets, users } from "db/schema";
import { requireProjectAccess } from "lib/project-access";
import { MAX_DESCRIPTION } from "lib/issues";
import { isUuid } from "lib/membership";
import { checklistProgress, findIssue, issueSlug, logActivity, sameIds, toggleChecklistItem } from "lib/issues";

type Ctx = { params: Promise<{ projectId: string; number: string }> };

const assignee = alias(users, "assignee");
const author = alias(users, "author");
const closer = alias(users, "closer");

async function load(params: Awaited<Ctx["params"]>) {
  const access = await requireProjectAccess(params.projectId);
  if (access.error) return { access, issue: null };
  const number = Number(params.number);
  const issue = await findIssue(access.project.id, number);
  return { access, issue: issue ?? null };
}

// Detail issue + komentar + activity (digabung urut waktu di UI).
export async function GET(_req: Request, props: Ctx) {
  const params = await props.params;
  const { access, issue } = await load(params);
  if (access.error) return access.error;
  if (!issue) return NextResponse.json({ message: "Issue not found" }, { status: 404 });

  const [detail] = await db
    .select({
      id: tickets.id,
      number: tickets.number,
      title: tickets.title,
      description: tickets.description,
      labels: tickets.labels,
      statusId: tickets.statusId,
      dueDate: tickets.dueDate,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      closedAt: tickets.closedAt,
      assigneeId: assignee.id,
      assigneeName: assignee.name,
      assigneeAvatar: assignee.avatarUrl,
      authorId: author.id,
      authorName: author.name,
      authorAvatar: author.avatarUrl,
      closedByName: closer.name,
    })
    .from(tickets)
    .leftJoin(assignee, eq(assignee.id, tickets.assignedTo))
    .leftJoin(author, eq(author.id, tickets.createdBy))
    .leftJoin(closer, eq(closer.id, tickets.closedBy))
    .where(eq(tickets.id, issue.id));

  const [comments, events] = await Promise.all([
    db
      .select({
        id: ticketReplies.id,
        body: ticketReplies.message,
        createdAt: ticketReplies.createdAt,
        authorId: users.id,
        authorName: users.name,
        authorAvatar: users.avatarUrl,
      })
      .from(ticketReplies)
      .leftJoin(users, eq(users.id, ticketReplies.userId))
      .where(eq(ticketReplies.ticketId, issue.id))
      .orderBy(asc(ticketReplies.createdAt)),
    db
      .select({
        id: activity.id,
        type: activity.type,
        data: activity.data,
        createdAt: activity.createdAt,
        actorId: users.id,
        actorName: users.name,
        actorAvatar: users.avatarUrl,
      })
      .from(activity)
      .leftJoin(users, eq(users.id, activity.actorId))
      .where(eq(activity.ticketId, issue.id))
      .orderBy(desc(activity.createdAt))
      .limit(200),
  ]);

  return NextResponse.json({
    issue: {
      ...detail,
      labels: detail.labels ?? [],
      checklist: checklistProgress(detail.description),
      assignee: detail.assigneeId ? { id: detail.assigneeId, name: detail.assigneeName, avatarUrl: detail.assigneeAvatar } : null,
      author: detail.authorId ? { id: detail.authorId, name: detail.authorName, avatarUrl: detail.authorAvatar } : null,
    },
    comments,
    events: events.reverse(),
    canDelete: access.role === "owner" || detail.authorId === access.user.id,
  });
}

// Ubah issue. Setiap perubahan dicatat di activity.
export async function PATCH(req: Request, props: Ctx) {
  const params = await props.params;
  const { access, issue } = await load(params);
  if (access.error) return access.error;
  if (!issue) return NextResponse.json({ message: "Issue not found" }, { status: 404 });
  const { project, user } = access;

  const body = await req.json().catch(() => ({}));
  const patch: Partial<typeof tickets.$inferInsert> = {};
  const log: Parameters<typeof logActivity>[0][] = [];
  const base = { projectId: project.id, ticketId: issue.id, actorId: user.id };

  if (body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > 200) {
      return NextResponse.json({ message: "Title is required (max 200 characters)" }, { status: 400 });
    }
    if (title !== issue.title) {
      patch.title = title;
      patch.slug = issueSlug(issue.number!, title);
      log.push({ ...base, type: "title", data: { from: issue.title, to: title } });
    }
  }

  let description = issue.description;
  if (typeof body.description === "string" && body.description.length > MAX_DESCRIPTION) {
    return NextResponse.json({ message: "Description is too long (max 50,000 characters)" }, { status: 400 });
  }
  if (typeof body.description === "string" && body.description !== issue.description) {
    description = body.description;
    patch.description = description;
    log.push({ ...base, type: "description" });
  }
  if (body.checklist && Number.isInteger(body.checklist.index)) {
    description = toggleChecklistItem(description, body.checklist.index, body.checklist.checked === true);
    patch.description = description;
  }

  if (body.statusId !== undefined && body.statusId !== issue.statusId) {
    if (!isUuid(body.statusId)) return NextResponse.json({ message: "Invalid column" }, { status: 400 });
    const status = await db.query.ticketStatuses.findFirst({
      where: and(eq(ticketStatuses.id, String(body.statusId)), eq(ticketStatuses.projectId, project.id)),
    });
    if (!status) return NextResponse.json({ message: "Invalid column" }, { status: 400 });
    const from = await db.query.ticketStatuses.findFirst({ where: eq(ticketStatuses.id, issue.statusId) });
    patch.statusId = status.id;
    log.push({ ...base, type: "status", data: { from: from?.name ?? null, to: status.name } });
  }

  if (body.assigneeId !== undefined) {
    const next = typeof body.assigneeId === "string" && body.assigneeId ? body.assigneeId : null;
    if (next !== issue.assignedTo) {
      if (next) {
        const member = isUuid(next)
          ? await db.query.projectMembers.findFirst({
              where: and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, next)),
            })
          : undefined;
        const candidate = member ? await db.query.users.findFirst({ where: eq(users.id, next) }) : undefined;
        if (!member || candidate?.isActive === false) {
          return NextResponse.json({ message: "Assignee must be an active project member" }, { status: 400 });
        }
      }
      const nextUser = next ? await db.query.users.findFirst({ where: eq(users.id, next) }) : null;
      patch.assignedTo = next;
      log.push({ ...base, type: "assignee", data: { to: nextUser?.name ?? null } });
    }
  }

  if (Array.isArray(body.labelIds)) {
    const wanted: string[] = body.labelIds.filter(isUuid);
    const valid = wanted.length
      ? await db
          .select({ id: projectLabels.id, name: projectLabels.name })
          .from(projectLabels)
          .where(and(eq(projectLabels.projectId, project.id), inArray(projectLabels.id, wanted)))
      : [];
    const nextIds = valid.map((l) => l.id);
    const prevIds = issue.labels ?? [];
    if (!sameIds(nextIds, prevIds)) {
      patch.labels = nextIds;
      const added = valid.filter((l) => !prevIds.includes(l.id)).map((l) => l.name);
      const removedIds = prevIds.filter((id) => !nextIds.includes(id));
      const removed = removedIds.length
        ? (await db.select({ name: projectLabels.name }).from(projectLabels).where(inArray(projectLabels.id, removedIds))).map((l) => l.name)
        : [];
      log.push({ ...base, type: "labels", data: { added, removed } });
    }
  }

  if (body.dueDate !== undefined) {
    const next = typeof body.dueDate === "string" && body.dueDate ? new Date(body.dueDate) : null;
    if (next && Number.isNaN(next.getTime())) {
      return NextResponse.json({ message: "Invalid due date" }, { status: 400 });
    }
    const prev = issue.dueDate ? new Date(issue.dueDate).getTime() : null;
    if ((next?.getTime() ?? null) !== prev) {
      patch.dueDate = next;
      log.push({ ...base, type: "due_date", data: { to: next ? next.toISOString() : null } });
    }
  }

  if (body.state === "closed" && !issue.closedAt) {
    patch.closedAt = new Date();
    patch.closedBy = user.id;
    log.push({ ...base, type: "closed" });
  } else if (body.state === "open" && issue.closedAt) {
    patch.closedAt = null;
    patch.closedBy = null;
    log.push({ ...base, type: "reopened" });
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ success: true });

  patch.updatedAt = new Date();
  await db.update(tickets).set(patch).where(eq(tickets.id, issue.id));
  for (const entry of log) await logActivity(entry);

  return NextResponse.json({ success: true });
}

// Hapus issue: pembuat issue atau owner project.
export async function DELETE(_req: Request, props: Ctx) {
  const params = await props.params;
  const { access, issue } = await load(params);
  if (access.error) return access.error;
  if (!issue) return NextResponse.json({ message: "Issue not found" }, { status: 404 });

  if (access.role !== "owner" && issue.createdBy !== access.user.id) {
    return NextResponse.json({ message: "Only the author or a project owner can delete this issue" }, { status: 403 });
  }

  await db.delete(tickets).where(eq(tickets.id, issue.id));
  return NextResponse.json({ success: true });
}
