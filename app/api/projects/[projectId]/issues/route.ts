import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "db";
import { projectLabels, projectMembers, ticketStatuses, tickets, users } from "db/schema";
import { requireProjectAccess } from "lib/project-access";
import { MAX_DESCRIPTION } from "lib/issues";
import { limitUser } from "lib/api-auth";
import { userLimits } from "lib/rate-limit";
import { isUuid } from "lib/membership";
import { countIssues, listIssues, type IssueSort, type IssueState } from "lib/issue-queries";
import { allocateIssueNumber, ensureStatuses, issueSlug, logActivity, referenceCode } from "lib/issues";

type Ctx = { params: Promise<{ projectId: string }> };

const STATES: IssueState[] = ["open", "closed", "all"];
const SORTS: IssueSort[] = ["updated", "created", "due", "number"];

// Daftar issue project dengan filter: ?state=&q=&label=id,id&assignee=<id|none|me>&sort=
export async function GET(req: Request, props: Ctx) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId);
  if (access.error) return access.error;

  const sp = new URL(req.url).searchParams;
  const state = STATES.includes(sp.get("state") as IssueState) ? (sp.get("state") as IssueState) : "open";
  const sort = SORTS.includes(sp.get("sort") as IssueSort) ? (sp.get("sort") as IssueSort) : "updated";
  const assigneeParam = sp.get("assignee") ?? undefined;
  const filters = {
    q: sp.get("q") ?? undefined,
    labelIds: sp.get("label")?.split(",").filter(Boolean),
    assignee: assigneeParam === "me" ? access.user.id : assigneeParam,
    hasDueDate: sp.get("hasDueDate") === "1" || undefined,
  };

  const [issues, counts] = await Promise.all([
    listIssues([access.project.id], { ...filters, state, sort }),
    countIssues([access.project.id], filters),
  ]);
  return NextResponse.json({ issues, counts });
}

// Buat issue baru. Nomor diambil dari penghitung project.
export async function POST(req: Request, props: Ctx) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId);
  if (access.error) return access.error;
  const { project, user } = access;
  const limited = await limitUser(userLimits.issue(user.id));
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description : "";
  if (description.length > MAX_DESCRIPTION) {
    return NextResponse.json({ message: "Description is too long (max 50,000 characters)" }, { status: 400 });
  }
  if (!title || title.length > 200) {
    return NextResponse.json({ message: "Title is required (max 200 characters)" }, { status: 400 });
  }

  const statuses = await ensureStatuses(project.id);
  let statusId = statuses[0].id;
  if (typeof body.statusId === "string" && body.statusId) {
    if (!isUuid(body.statusId)) return NextResponse.json({ message: "Invalid column" }, { status: 400 });
    const valid = await db.query.ticketStatuses.findFirst({
      where: and(eq(ticketStatuses.id, body.statusId), eq(ticketStatuses.projectId, project.id)),
    });
    if (!valid) return NextResponse.json({ message: "Invalid column" }, { status: 400 });
    statusId = valid.id;
  }

  let assigneeId: string | null = null;
  if (typeof body.assigneeId === "string" && body.assigneeId) {
    const member = isUuid(body.assigneeId)
      ? await db.query.projectMembers.findFirst({
          where: and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, body.assigneeId)),
        })
      : undefined;
    const assignee = member ? await db.query.users.findFirst({ where: eq(users.id, body.assigneeId) }) : undefined;
    if (!member || assignee?.isActive === false) {
      return NextResponse.json({ message: "Assignee must be an active project member" }, { status: 400 });
    }
    assigneeId = body.assigneeId;
  }

  let labelIds: string[] = [];
  if (Array.isArray(body.labelIds) && body.labelIds.length) {
    const wanted: string[] = body.labelIds.filter(isUuid);
    const found = wanted.length
      ? await db
          .select({ id: projectLabels.id })
          .from(projectLabels)
          .where(and(eq(projectLabels.projectId, project.id), inArray(projectLabels.id, wanted)))
      : [];
    labelIds = found.map((l) => l.id);
  }

  const dueDate = typeof body.dueDate === "string" && body.dueDate ? new Date(body.dueDate) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) {
    return NextResponse.json({ message: "Invalid due date" }, { status: 400 });
  }

  try {
    const number = await allocateIssueNumber(project.id);
    const [issue] = await db
      .insert(tickets)
      .values({
        number,
        title,
        slug: issueSlug(number, title),
        description,
        projectId: project.id,
        team: project.team,
        statusId,
        assignedTo: assigneeId,
        labels: labelIds,
        dueDate,
        userId: user.id,
        createdBy: user.id,
        referenceCode: referenceCode(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: tickets.id, number: tickets.number });

    await logActivity({ projectId: project.id, ticketId: issue.id, actorId: user.id, type: "created" });
    return NextResponse.json({ number: issue.number }, { status: 201 });
  } catch (error) {
    console.error("POST issues error:", error);
    return NextResponse.json({ message: "Failed to create issue" }, { status: 500 });
  }
}
