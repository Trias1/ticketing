import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "db";
import { activity, tickets, users } from "db/schema";
import { requireProjectAccess } from "lib/project-access";

// 100 aktivitas terbaru di project.
export async function GET(_req: Request, props: { params: Promise<{ projectId: string }> }) {
  const params = await props.params;
  const access = await requireProjectAccess(params.projectId);
  if (access.error) return access.error;

  const events = await db
    .select({
      id: activity.id,
      type: activity.type,
      data: activity.data,
      createdAt: activity.createdAt,
      actorName: users.name,
      actorAvatar: users.avatarUrl,
      issueNumber: tickets.number,
      issueTitle: tickets.title,
    })
    .from(activity)
    .leftJoin(users, eq(users.id, activity.actorId))
    .leftJoin(tickets, eq(tickets.id, activity.ticketId))
    .where(eq(activity.projectId, access.project.id))
    .orderBy(desc(activity.createdAt))
    .limit(100);

  return NextResponse.json(events);
}
