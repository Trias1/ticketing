import { db } from "db";
import { tickets, ticketStatuses } from "db/schema";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import SummaryCard from "components/SummaryCard";
import { getCurrentUser } from "lib/auth";

export default async function StatistikPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect(`/dashboard/${user.team}`);

  // Group by team + status name
  const stats = await db
    .select({
      team: tickets.team,
      statusName: ticketStatuses.name,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(tickets)
    .leftJoin(ticketStatuses, eq(tickets.statusId, ticketStatuses.id))
    .groupBy(tickets.team, ticketStatuses.name)
    .orderBy(tickets.team, ticketStatuses.name);

  // Group stats by team
  const teamMap = new Map<string, { total: number; statuses: { name: string; count: number }[] }>();

  for (const row of stats) {
    if (!row.team) continue;
    if (!teamMap.has(row.team)) {
      teamMap.set(row.team, { total: 0, statuses: [] });
    }
    const entry = teamMap.get(row.team)!;
    entry.total += row.count;
    entry.statuses.push({ name: row.statusName ?? "Unknown", count: row.count });
  }

  const summaryData = Array.from(teamMap.entries()).flatMap(([team, data]) => [
    { title: `Total Tiket (${team})`, value: data.total },
    ...data.statuses.map((s) => ({
      title: `${s.name} (${team})`,
      value: s.count,
    })),
  ]);

  return (
    <div className="p-6 text-gray-900 dark:text-gray-100">
      <h1 className="text-2xl font-semibold mb-6">Statistik Tiket per Tim</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {summaryData.map((item, index) => (
          <SummaryCard key={index} title={item.title} value={item.value} />
        ))}
      </div>
    </div>
  );
}
