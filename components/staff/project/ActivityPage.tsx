"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { Activity } from "lucide-react";
import { Avatar, EmptyState, Skeleton, formatDate, timeAgo } from "components/ui/kit";
import { fetcher, useProject } from "../hooks";
import { ActivityIcon, activityText } from "../issue-ui";
import PageTitle from "./ProjectHeader";

type Event = {
  id: string;
  type: string;
  data: Record<string, unknown> | null;
  createdAt: string;
  actorName: string | null;
  actorAvatar: string | null;
  issueNumber: number | null;
  issueTitle: string | null;
};

// Riwayat project, dikelompokkan per hari.
export default function ActivityPage({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  const { data: events, isLoading } = useSWR<Event[]>(`/api/projects/${projectId}/activity`, fetcher, { refreshInterval: 30_000 });

  const groups = new Map<string, Event[]>();
  for (const e of events ?? []) {
    const day = formatDate(e.createdAt);
    groups.set(day, [...(groups.get(day) ?? []), e]);
  }
  // Dari URL, supaya link valid walau data project belum selesai dimuat.
  const base = usePathname().replace(/\/activity$/, "");

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageTitle title="Activity" />

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !events?.length ? (
          <EmptyState icon={Activity} title="No activity yet" description="Creating, moving, and closing issues shows up here." />
        ) : (
          [...groups.entries()].map(([day, list]) => (
            <section key={day}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tk-faint">{day}</h3>
              <ol className="divide-y divide-tk-divider rounded-lg border border-tk-border bg-tk-surface dark:divide-tk-dark-divider dark:border-tk-dark-border dark:bg-tk-dark-surface">
                {list.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                    <Avatar name={e.actorName} src={e.actorAvatar} size={26} />
                    <div className="min-w-0 flex-1">
                      <p>
                        <span className="font-medium">{e.actorName ?? "Someone"}</span>{" "}
                        <span className="text-tk-muted dark:text-tk-dark-muted">{activityText(e)}</span>
                      </p>
                      {e.issueNumber && (
                        <Link href={`${base}/issues/${e.issueNumber}`} className="block truncate text-tk-accent hover:underline dark:text-[#5eead4]">
                          #{e.issueNumber} {e.issueTitle}
                        </Link>
                      )}
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-tk-faint">
                      <ActivityIcon type={e.type} />
                      {timeAgo(e.createdAt)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
