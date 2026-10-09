import { NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "db";
import { activity, projects, tickets, users } from "db/schema";
import { requireUser } from "lib/api-auth";
import { listIssues, memberProjects } from "lib/issue-queries";

export const dynamic = "force-dynamic";

// Data dashboard staff: angka ringkas, issue saya, aktivitas terbaru, dan project.
export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const me = auth.user.id;

  const projectList = await memberProjects(me);
  const ids = projectList.map((p) => p.id);

  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [assigned, created, recent] = await Promise.all([
    listIssues(ids, { state: "open", assignee: me, sort: "due" }),
    listIssues(ids, { state: "open", authorId: me, sort: "updated", limit: 50 }),
    ids.length
      ? db
          .select({
            id: activity.id,
            type: activity.type,
            data: activity.data,
            createdAt: activity.createdAt,
            actorName: users.name,
            actorAvatar: users.avatarUrl,
            issueNumber: tickets.number,
            issueTitle: tickets.title,
            projectName: projects.name,
            projectSlug: projects.slug,
            projectTeam: projects.team,
          })
          .from(activity)
          .leftJoin(users, eq(users.id, activity.actorId))
          .leftJoin(tickets, eq(tickets.id, activity.ticketId))
          .innerJoin(projects, eq(projects.id, activity.projectId))
          .where(inArray(activity.projectId, ids))
          .orderBy(desc(activity.createdAt))
          .limit(12)
      : Promise.resolve([]),
  ]);

  // Due date disimpan sebagai tanggal (00:00 UTC), jadi bandingkan dengan awal hari ini.
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const overdue = assigned.filter((i) => i.dueDate && new Date(i.dueDate) < today);
  const dueSoon = assigned.filter((i) => i.dueDate && new Date(i.dueDate) >= today && new Date(i.dueDate) <= weekAhead);

  return NextResponse.json({
    counts: {
      assigned: assigned.length,
      created: created.length,
      overdue: overdue.length,
      dueThisWeek: dueSoon.length,
    },
    assigned: assigned.slice(0, 8),
    recent,
    projects: projectList,
  });
}
