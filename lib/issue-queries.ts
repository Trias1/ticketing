import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "db";
import { projectLabels, projectMembers, projects, ticketReplies, tickets, users } from "db/schema";
import { checklistProgress } from "lib/issues";
import { isIssueNumber, isUuid } from "lib/membership";

export type IssueState = "open" | "closed" | "all";
export type IssueSort = "updated" | "created" | "due" | "number";

export type IssueFilters = {
  state?: IssueState;
  q?: string;
  labelIds?: string[];
  assignee?: string; // userId | "none"
  authorId?: string;
  dueBefore?: Date;
  hasDueDate?: boolean;
  sort?: IssueSort;
  limit?: number;
};

const assignee = alias(users, "assignee");
const author = alias(users, "author");

function stateCondition(state: IssueState) {
  if (state === "open") return isNull(tickets.closedAt);
  if (state === "closed") return isNotNull(tickets.closedAt);
  return undefined;
}

// Kondisi filter selain state; dipakai juga untuk menghitung jumlah per tab.
function filterConditions(projectIds: string[], f: IssueFilters) {
  const conds: (SQL | undefined)[] = [inArray(tickets.projectId, projectIds), isNotNull(tickets.number)];
  if (f.q?.trim()) {
    const term = `%${f.q.trim().replace(/[%_\\]/g, "\\$&")}%`;
    const asNumber = Number(f.q.replace(/^#/, ""));
    conds.push(
      isIssueNumber(asNumber)
        ? or(ilike(tickets.title, term), eq(tickets.number, asNumber))
        : ilike(tickets.title, term)
    );
  }
  for (const id of f.labelIds ?? []) {
    conds.push(sql`${id} = ANY(${tickets.labels})`);
  }
  if (f.assignee === "none") conds.push(isNull(tickets.assignedTo));
  else if (f.assignee) conds.push(isUuid(f.assignee) ? eq(tickets.assignedTo, f.assignee) : sql`false`);
  if (f.authorId) conds.push(eq(tickets.createdBy, f.authorId));
  if (f.hasDueDate) conds.push(isNotNull(tickets.dueDate));
  if (f.dueBefore) conds.push(sql`${tickets.dueDate} < ${f.dueBefore}`);
  return conds;
}

export async function listIssues(projectIds: string[], f: IssueFilters = {}) {
  if (projectIds.length === 0) return [];
  const state = f.state ?? "open";
  const order =
    f.sort === "created"
      ? [desc(tickets.createdAt)]
      : f.sort === "due"
        ? [sql`${tickets.dueDate} asc nulls last`, desc(tickets.updatedAt)]
        : f.sort === "number"
          ? [desc(tickets.number)]
          : [desc(tickets.updatedAt)];

  const rows = await db
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
      projectId: tickets.projectId,
      projectName: projects.name,
      projectSlug: projects.slug,
      projectTeam: projects.team,
      projectColor: projects.color,
      projectIcon: projects.icon,
      assigneeId: assignee.id,
      assigneeName: assignee.name,
      assigneeAvatar: assignee.avatarUrl,
      authorId: author.id,
      authorName: author.name,
      commentCount: sql<number>`cast((select count(*) from ${ticketReplies} where ${ticketReplies.ticketId} = ${tickets.id}) as int)`,
    })
    .from(tickets)
    .innerJoin(projects, eq(projects.id, tickets.projectId))
    .leftJoin(assignee, eq(assignee.id, tickets.assignedTo))
    .leftJoin(author, eq(author.id, tickets.createdBy))
    .where(and(...filterConditions(projectIds, f), stateCondition(state)))
    .orderBy(...order)
    .limit(f.limit ?? 500);

  // Detail label (nama & warna) supaya daftar lintas project tetap bisa menampilkan chip label.
  const labelIds = [...new Set(rows.flatMap((r) => r.labels ?? []))].filter(isUuid);
  const labelRows = labelIds.length
    ? await db
        .select({ id: projectLabels.id, name: projectLabels.name, color: projectLabels.color })
        .from(projectLabels)
        .where(inArray(projectLabels.id, labelIds))
    : [];
  const labelMap = new Map(labelRows.map((l) => [l.id, l]));

  return rows.map(({ description, assigneeId, assigneeName, assigneeAvatar, authorId, authorName, ...r }) => ({
    ...r,
    labels: r.labels ?? [],
    labelDetails: (r.labels ?? []).map((id) => labelMap.get(id)).filter((l): l is NonNullable<typeof l> => !!l),
    checklist: checklistProgress(description),
    assignee: assigneeId ? { id: assigneeId, name: assigneeName!, avatarUrl: assigneeAvatar } : null,
    author: authorId ? { id: authorId, name: authorName! } : null,
  }));
}

export type IssueListItem = Awaited<ReturnType<typeof listIssues>>[number];

// Jumlah issue per tab (Open / Closed / All) dengan filter yang sama.
export async function countIssues(projectIds: string[], f: IssueFilters = {}) {
  if (projectIds.length === 0) return { open: 0, closed: 0, all: 0 };
  const [row] = await db
    .select({
      open: sql<number>`cast(count(*) filter (where ${tickets.closedAt} is null) as int)`,
      closed: sql<number>`cast(count(*) filter (where ${tickets.closedAt} is not null) as int)`,
      all: sql<number>`cast(count(*) as int)`,
    })
    .from(tickets)
    .where(and(...filterConditions(projectIds, f)));
  return row;
}

// Semua project tempat user jadi member, beserta jumlah issue open.
export async function memberProjects(userId: string) {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      team: projects.team,
      description: projects.description,
      color: projects.color,
      icon: projects.icon,
      updatedAt: projects.updatedAt,
      role: projectMembers.role,
      starred: projectMembers.starred,
      openIssues: sql<number>`cast((select count(*) from ${tickets} where ${tickets.projectId} = ${projects.id} and ${tickets.closedAt} is null and ${tickets.number} is not null) as int)`,
      memberCount: sql<number>`cast((select count(*) from ${projectMembers} pm2 where pm2.project_id = ${projects.id}) as int)`,
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .where(eq(projectMembers.userId, userId))
    .orderBy(asc(projects.team), asc(projects.name));
}
