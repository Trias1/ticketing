import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "db";
import { tickets } from "db/schema";
import { loadMemberProject } from "lib/server-project";

// URL lama /tiket/<slug>: cari issue-nya lalu arahkan ke /issues/<nomor>.
export default async function LegacyTicket(props: { params: Promise<{ team: string; slug: string; ticketSlug: string }> }) {
  const params = await props.params;
  const { project } = await loadMemberProject(params);
  const ticket = await db.query.tickets.findFirst({
    where: and(eq(tickets.projectId, project.id), eq(tickets.slug, params.ticketSlug)),
  });
  if (!ticket?.number) notFound();
  redirect(`/dashboard/${params.team}/project/${params.slug}/issues/${ticket.number}`);
}
