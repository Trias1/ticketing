"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { AlertTriangle, ArrowRight, CalendarClock, FolderPlus, PenSquare, Star, Ticket } from "lucide-react";
import { ButtonLink, Card, EmptyState, ProjectAvatar, Skeleton, TEAM_LABEL, TextLink, timeAgo } from "components/ui/kit";
import { fetcher, lastProjectId, projectBase, type MyProject } from "./hooks";
import { ActivityIcon, activityText, IssueRow, type IssueListItem } from "./issue-ui";

type Dashboard = {
  counts: { assigned: number; created: number; overdue: number; dueThisWeek: number };
  assigned: IssueListItem[];
  recent: {
    id: string;
    type: string;
    data: Record<string, unknown> | null;
    createdAt: string;
    actorName: string | null;
    issueNumber: number | null;
    issueTitle: string | null;
    projectName: string;
    projectSlug: string;
    projectTeam: string;
  }[];
  projects: MyProject[];
};

export default function StaffDashboard({ homeTeam, userName }: { homeTeam: string; userName?: string }) {
  const { data, isLoading, error } = useSWR<Dashboard>("/api/me/dashboard", fetcher, { refreshInterval: 60_000 });
  const [lastId, setLastId] = useState<string | null>(null);
  useEffect(() => setLastId(lastProjectId()), []);

  const continueProject = data?.projects.find((p) => p.id === lastId) ?? null;
  const home = `/dashboard/${homeTeam}`;

  const stats = [
    { label: "Assigned to you", value: data?.counts.assigned, icon: Ticket, href: `${home}/issues` },
    { label: "Created by you", value: data?.counts.created, icon: PenSquare, href: `${home}/issues?scope=created` },
    { label: "Overdue", value: data?.counts.overdue, icon: AlertTriangle, href: `${home}/issues`, warn: true },
    { label: "Due this week", value: data?.counts.dueThisWeek, icon: CalendarClock, href: `${home}/issues` },
  ];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 border-b border-tk-divider pb-5 dark:border-tk-dark-divider sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm text-tk-muted dark:text-tk-dark-muted">
              {userName ? `${userName}, here's` : "Here's"} what needs your attention across your projects.
            </p>
          </div>
          {continueProject && (
            <Link
              href={`${projectBase(continueProject)}/issues`}
              className="group flex items-center gap-3 rounded-lg border border-tk-border bg-tk-surface px-3 py-2 hover:border-[#d4d4d8] dark:border-tk-dark-border dark:bg-tk-dark-surface dark:hover:border-[#3f3f46]"
            >
              <ProjectAvatar name={continueProject.name} color={continueProject.color} icon={continueProject.icon} size={28} />
              <span className="text-sm">
                <span className="block text-xs text-tk-muted dark:text-tk-dark-muted">Continue in</span>
                <span className="font-semibold">{continueProject.name}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-tk-faint transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>

        {error && <p className="text-sm text-tk-red">{error.message}</p>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            const alert = s.warn && (s.value ?? 0) > 0;
            return (
              <Link
                key={s.label}
                href={s.href}
                className="rounded-lg border border-tk-border bg-tk-surface p-4 transition-colors hover:border-[#d4d4d8] dark:border-tk-dark-border dark:bg-tk-dark-surface dark:hover:border-[#3f3f46]"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-tk-muted dark:text-tk-dark-muted">
                  <Icon className="h-4 w-4" /> {s.label}
                </span>
                {isLoading ? (
                  <Skeleton className="mt-3 h-8 w-12" />
                ) : (
                  <p className={`mt-2 text-3xl font-semibold tabular-nums ${alert ? "text-tk-red dark:text-[#fca5a5]" : ""}`}>
                    {s.value ?? 0}
                  </p>
                )}
              </Link>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card
            className="lg:col-span-2"
            title="Assigned to you"
            action={<TextLink href={`${home}/issues`}>View all</TextLink>}
          >
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !data?.assigned.length ? (
              <EmptyState icon={Ticket} title="Nothing assigned to you" description="Issues assigned to you in any project show up here." />
            ) : (
              <ul className="divide-y divide-tk-divider dark:divide-tk-dark-divider">
                {data.assigned.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} showProject />
                ))}
              </ul>
            )}
          </Card>

          <Card title="Recent activity">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : !data?.recent.length ? (
              <EmptyState icon={CalendarClock} title="No activity yet" description="Changes to issues in your projects appear here." />
            ) : (
              <ol className="space-y-3 p-4">
                {data.recent.map((e) => (
                  <li key={e.id} className="flex gap-3 text-sm">
                    <span className="mt-0.5 text-tk-faint">
                      <ActivityIcon type={e.type} />
                    </span>
                    <span className="min-w-0">
                      <span className="font-medium">{e.actorName ?? "Someone"}</span>{" "}
                      <span className="text-tk-muted dark:text-tk-dark-muted">{activityText(e)}</span>
                      {e.issueNumber && (
                        <Link
                          href={`/dashboard/${e.projectTeam}/project/${e.projectSlug}/issues/${e.issueNumber}`}
                          className="block truncate text-tk-accent hover:underline dark:text-[#5eead4]"
                        >
                          #{e.issueNumber} {e.issueTitle}
                        </Link>
                      )}
                      <span className="block text-xs text-tk-faint">
                        {e.projectName} · {timeAgo(e.createdAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <Card
          title="Your projects"
          action={
            <ButtonLink href={`${home}/project/new`} variant="default">
              <FolderPlus className="h-4 w-4" /> New project
            </ButtonLink>
          }
        >
          {isLoading ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !data?.projects.length ? (
            <EmptyState
              icon={FolderPlus}
              title="You're not in any project yet"
              description="Create a project, or ask a project owner to add you."
              action={<ButtonLink href={`${home}/project/new`}>Create project</ButtonLink>}
            />
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.projects.map((p) => (
                <Link
                  key={p.id}
                  href={`${projectBase(p)}/issues`}
                  className="flex items-center gap-3 rounded-lg border border-tk-border p-3 hover:bg-tk-subtle dark:border-tk-dark-border dark:hover:bg-tk-dark-subtle"
                >
                  <ProjectAvatar name={p.name} color={p.color} icon={p.icon} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 font-medium">
                      <span className="truncate">{p.name}</span>
                      {p.starred && <Star className="h-3.5 w-3.5 shrink-0 fill-current text-[#ca8a04]" />}
                    </span>
                    <span className="block text-xs text-tk-muted dark:text-tk-dark-muted">
                      {TEAM_LABEL[p.team] ?? p.team} · {p.openIssues} open · {p.memberCount} {p.memberCount === 1 ? "member" : "members"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
