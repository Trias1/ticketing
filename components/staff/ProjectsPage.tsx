"use client";

import { useState } from "react";
import Link from "next/link";
import { mutate } from "swr";
import clsx from "clsx";
import { toast } from "sonner";
import { FolderPlus, Search, Star } from "lucide-react";
import { Badge, ButtonLink, EmptyState, ProjectAvatar, Skeleton, TeamBadge, timeAgo } from "components/ui/kit";
import { projectBase, sendJson, useMyProjects, type MyProject } from "./hooks";

type Tab = "all" | "starred" | "owned";

export default function ProjectsPage({ homeTeam }: { homeTeam: string }) {
  const { data: projects, isLoading } = useMyProjects();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");

  const list = projects ?? [];
  const counts = { all: list.length, starred: list.filter((p) => p.starred).length, owned: list.filter((p) => p.role === "owner").length };
  const filtered = list.filter(
    (p) =>
      (tab === "all" || (tab === "starred" ? p.starred : p.role === "owner")) &&
      (p.name.toLowerCase().includes(query.toLowerCase()) || (p.description ?? "").toLowerCase().includes(query.toLowerCase()))
  );

  const toggleStar = async (p: MyProject) => {
    try {
      await sendJson(`/api/projects/${p.id}/star`, "POST", { starred: !p.starred });
      await mutate("/api/me/projects");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update star");
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-4 border-b border-tk-divider pb-5 dark:border-tk-dark-divider sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="mt-1 text-sm text-tk-muted dark:text-tk-dark-muted">Projects you&apos;re a member of, across all teams.</p>
          </div>
          <ButtonLink href={`/dashboard/${homeTeam}/project/new`}>
            <FolderPlus className="h-4 w-4" /> New project
          </ButtonLink>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-tk-divider dark:border-tk-dark-divider">
            {(["all", "starred", "owned"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={clsx(
                  "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm",
                  tab === t
                    ? "border-tk-accent font-semibold dark:border-[#5eead4]"
                    : "border-transparent text-tk-muted hover:text-tk-text dark:text-tk-dark-muted"
                )}
              >
                {t === "owned" ? "Owned by you" : t === "starred" ? "Starred" : "All"}
                <span className="rounded-full bg-tk-subtle px-1.5 text-xs tabular-nums text-tk-muted dark:bg-tk-dark-subtle dark:text-tk-dark-muted">
                  {counts[t]}
                </span>
              </button>
            ))}
          </div>
          <label className="flex h-8 items-center gap-2 rounded-md border border-tk-border bg-tk-surface px-2.5 text-sm focus-within:border-tk-accent focus-within:ring-2 focus-within:ring-tk-accent/20 dark:border-tk-dark-border dark:bg-tk-dark-surface sm:w-72">
            <Search className="h-4 w-4 text-tk-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name"
              className="w-full bg-transparent outline-hidden placeholder:text-tk-faint"
            />
          </label>
        </div>

        <div className="overflow-hidden rounded-lg border border-tk-border bg-tk-surface dark:border-tk-dark-border dark:bg-tk-dark-surface">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FolderPlus}
              title={list.length === 0 ? "You're not in any project yet" : "No projects match"}
              description={list.length === 0 ? "Create a project, or ask a project owner to add you." : "Try another tab or name."}
              action={list.length === 0 ? <ButtonLink href={`/dashboard/${homeTeam}/project/new`}>Create project</ButtonLink> : undefined}
            />
          ) : (
            <ul className="divide-y divide-tk-divider dark:divide-tk-dark-divider">
              {filtered.map((p) => (
                <li key={p.id} className="flex items-center gap-4 px-4 py-3 hover:bg-tk-subtle/70 dark:hover:bg-tk-dark-subtle/60">
                  <ProjectAvatar name={p.name} color={p.color} icon={p.icon} size={36} />
                  <Link href={`${projectBase(p)}/issues`} className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold hover:text-tk-accent dark:hover:text-[#5eead4]">{p.name}</span>
                      <TeamBadge team={p.team} />
                      {p.role === "owner" && <Badge tone="accent">Owner</Badge>}
                    </span>
                    <span className="block truncate text-sm text-tk-muted dark:text-tk-dark-muted">{p.description || "No description"}</span>
                  </Link>
                  <span className="hidden text-right text-xs text-tk-muted dark:text-tk-dark-muted sm:block">
                    <span className="block">
                      {p.openIssues} open · {p.memberCount} {p.memberCount === 1 ? "member" : "members"}
                    </span>
                    <span className="block text-tk-faint">updated {timeAgo(p.updatedAt).toLowerCase()}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleStar(p)}
                    aria-pressed={p.starred}
                    aria-label={p.starred ? `Unstar ${p.name}` : `Star ${p.name}`}
                    className="rounded-sm p-1.5 hover:bg-tk-subtle dark:hover:bg-tk-dark-subtle"
                  >
                    <Star className={clsx("h-4 w-4", p.starred ? "fill-current text-[#ca8a04]" : "text-tk-faint")} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
