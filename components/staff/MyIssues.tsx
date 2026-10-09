"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import clsx from "clsx";
import { Search, Ticket } from "lucide-react";
import { EmptyState, Skeleton } from "components/ui/kit";
import { fetcher } from "./hooks";
import { IssueRow, type IssueListItem } from "./issue-ui";

type State = "open" | "closed" | "all";

// Issue lintas project: yang di-assign ke saya atau yang saya buat.
export default function MyIssues() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const scope = params.get("scope") === "created" ? "created" : "assigned";
  const state = (["open", "closed", "all"].includes(params.get("state") ?? "") ? params.get("state") : "open") as State;
  const q = params.get("q") ?? "";
  const [search, setSearch] = useState(q);

  const setParams = (next: Record<string, string | null>) => {
    // Baca URL saat ini supaya perubahan filter lain tidak tertimpa oleh pencarian yang tertunda.
    const sp = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => setParams({ q: search.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const query = new URLSearchParams({ scope, state, sort: "updated" });
  if (q) query.set("q", q);
  const { data, isLoading } = useSWR<{ issues: IssueListItem[]; counts: Record<State, number> }>(`/api/me/issues?${query}`, fetcher, {
    keepPreviousData: true,
  });

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="border-b border-tk-divider pb-5 dark:border-tk-dark-divider">
          <h1 className="text-2xl font-semibold tracking-tight">My issues</h1>
          <p className="mt-1 text-sm text-tk-muted dark:text-tk-dark-muted">Issues across every project you&apos;re a member of.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-0.5 rounded-md bg-tk-subtle p-0.5 dark:bg-tk-dark-subtle">
            {(["assigned", "created"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setParams({ scope: s === "assigned" ? null : s })}
                className={clsx(
                  "rounded-sm px-2.5 py-1 text-sm",
                  scope === s
                    ? "bg-tk-surface font-medium shadow-[0_0_0_1px] shadow-tk-border dark:bg-tk-dark-surface dark:shadow-tk-dark-border"
                    : "text-tk-muted hover:text-tk-text dark:text-tk-dark-muted"
                )}
              >
                {s === "assigned" ? "Assigned to you" : "Created by you"}
              </button>
            ))}
          </div>
          <label className="flex h-8 min-w-[220px] flex-1 items-center gap-2 rounded-md border border-tk-border bg-tk-surface px-2.5 text-sm focus-within:border-tk-accent focus-within:ring-2 focus-within:ring-tk-accent/20 dark:border-tk-dark-border dark:bg-tk-dark-surface">
            <Search className="h-4 w-4 text-tk-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or #number"
              className="w-full bg-transparent outline-hidden placeholder:text-tk-faint"
            />
          </label>
        </div>

        <div className="flex gap-4 border-b border-tk-divider dark:border-tk-dark-divider">
          {(["open", "closed", "all"] as State[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setParams({ state: s === "open" ? null : s })}
              className={clsx(
                "-mb-px flex items-center gap-1.5 border-b-2 px-1 py-2 text-sm capitalize",
                state === s ? "border-tk-accent font-semibold dark:border-[#5eead4]" : "border-transparent text-tk-muted dark:text-tk-dark-muted"
              )}
            >
              {s}
              <span className="rounded-full bg-tk-subtle px-1.5 text-xs tabular-nums text-tk-muted dark:bg-tk-dark-subtle dark:text-tk-dark-muted">
                {data?.counts[s] ?? "–"}
              </span>
            </button>
          ))}
        </div>

        {isLoading && !data ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !data?.issues.length ? (
          <div className="rounded-lg border border-tk-border bg-tk-surface dark:border-tk-dark-border dark:bg-tk-dark-surface">
            <EmptyState
              icon={Ticket}
              title={scope === "assigned" ? "Nothing assigned to you here" : "You haven't created issues here"}
              description="Change the filters or check another tab."
            />
          </div>
        ) : (
          <ul className="divide-y divide-tk-divider overflow-hidden rounded-lg border border-tk-border bg-tk-surface dark:divide-tk-dark-divider dark:border-tk-dark-border dark:bg-tk-dark-surface">
            {data.issues.map((issue) => (
              <IssueRow key={issue.id} issue={issue} showProject />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
