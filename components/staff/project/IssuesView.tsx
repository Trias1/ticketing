"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import clsx from "clsx";
import { CalendarDays, ChevronDown, KanbanSquare, List, Plus, Search, Tag, Ticket, UserRound, X } from "lucide-react";
import { ButtonLink, EmptyState, LabelChip, Skeleton } from "components/ui/kit";
import { fetcher, useProject } from "../hooks";
import { IssueRow, type IssueListItem } from "../issue-ui";
import IssueDetail from "./IssueDetail";
import { LabelPicker } from "./pickers";
import Popover from "./Popover";
import { StarButton } from "./ProjectHeader";
import IssueBoard from "./IssueBoard";
import IssueCalendar from "./IssueCalendar";

type View = "list" | "board" | "calendar";
type State = "open" | "closed" | "all";
type Sort = "updated" | "created" | "due" | "number";

const SORT_LABEL: Record<Sort, string> = {
  updated: "Last updated",
  created: "Created date",
  due: "Due date",
  number: "Issue number",
};

export type IssuesResponse = { issues: IssueListItem[]; counts: { open: number; closed: number; all: number } };

export default function IssuesView({ projectId, currentUserId }: { projectId: string; currentUserId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data: project } = useProject(projectId);

  const view = (["list", "board", "calendar"].includes(params.get("view") ?? "") ? params.get("view") : "list") as View;
  const state = (["open", "closed", "all"].includes(params.get("state") ?? "") ? params.get("state") : "open") as State;
  const sort = (Object.keys(SORT_LABEL).includes(params.get("sort") ?? "") ? params.get("sort") : "updated") as Sort;
  const labelIds = params.get("label")?.split(",").filter(Boolean) ?? [];
  const assignee = params.get("assignee") ?? "";
  const q = params.get("q") ?? "";
  const peek = params.get("issue");

  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);

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

  // Cari otomatis setelah berhenti mengetik.
  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => setParams({ q: search.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Board menampilkan issue open saja; List & Calendar mengikuti tab state.
  const effectiveState: State = view === "board" ? "open" : state;
  const query = new URLSearchParams({ state: effectiveState, sort });
  if (q) query.set("q", q);
  if (labelIds.length) query.set("label", labelIds.join(","));
  if (assignee) query.set("assignee", assignee);
  if (view === "calendar") query.set("hasDueDate", "1");
  const { data, isLoading } = useSWR<IssuesResponse>(`/api/projects/${projectId}/issues?${query}`, fetcher, {
    keepPreviousData: true,
  });

  const statusName = useMemo(() => new Map(project?.statuses.map((s) => [s.id, s.name])), [project?.statuses]);
  const filtersActive = !!(q || labelIds.length || assignee);
  // Diambil dari URL (bukan data project) supaya link "New issue" tidak sempat menjadi "/issues/new" saat loading.
  const base = pathname.replace(/\/issues(\/.*)?$/, "");

  const openIssue = (i: { number: number }) => setParams({ issue: String(i.number) });
  const closePeek = () => setParams({ issue: null });

  useEffect(() => {
    if (!peek) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closePeek();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peek]);

  const assigneeLabel =
    assignee === "me"
      ? "Assigned to me"
      : assignee === "none"
        ? "Unassigned"
        : project?.members.find((m) => m.id === assignee)?.name ?? "Assignee";

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Tampilan + aksi */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-tk-divider pb-3 dark:border-tk-dark-divider">
          <div className="flex items-center gap-0.5 rounded-md bg-tk-subtle p-0.5 dark:bg-tk-dark-subtle" role="tablist" aria-label="View">
            {([
              ["list", List, "List"],
              ["board", KanbanSquare, "Board"],
              ["calendar", CalendarDays, "Calendar"],
            ] as const).map(([v, Icon, label]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setParams({ view: v === "list" ? null : v })}
                className={clsx(
                  "flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-sm",
                  view === v
                    ? "bg-tk-surface font-medium text-tk-text shadow-[0_0_0_1px] shadow-tk-border dark:bg-tk-dark-surface dark:text-tk-dark-text dark:shadow-tk-dark-border"
                    : "text-tk-muted hover:text-tk-text dark:text-tk-dark-muted dark:hover:text-tk-dark-text"
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <StarButton projectId={projectId} />
            <ButtonLink href={`${base}/issues/new`}>
              <Plus className="h-4 w-4" /> New issue
            </ButtonLink>
          </div>
        </div>

        {/* Filter */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="flex h-8 min-w-[220px] flex-1 items-center gap-2 rounded-md border border-tk-border bg-tk-surface px-2.5 text-sm focus-within:border-tk-accent focus-within:ring-2 focus-within:ring-tk-accent/20 dark:border-tk-dark-border dark:bg-tk-dark-surface">
            <Search className="h-4 w-4 text-tk-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or #number"
              className="w-full bg-transparent outline-hidden placeholder:text-tk-faint"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="text-tk-faint hover:text-tk-text">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>

          {project && (
            <LabelPicker
              labels={project.labels}
              value={labelIds}
              onChange={(ids) => setParams({ label: ids.join(",") || null })}
              trigger={(toggle) => (
                <FilterButton active={labelIds.length > 0} onClick={toggle} icon={Tag}>
                  {labelIds.length ? `${labelIds.length} ${labelIds.length === 1 ? "label" : "labels"}` : "Label"}
                </FilterButton>
              )}
            />
          )}

          <Popover
            width={240}
            trigger={({ toggle }) => (
              <FilterButton active={!!assignee} onClick={toggle} icon={UserRound}>
                {assignee ? assigneeLabel : "Assignee"}
              </FilterButton>
            )}
          >
            {(close) => (
              <div className="max-h-72 overflow-y-auto py-1">
                {[
                  { id: "", name: "Anyone" },
                  { id: "me", name: "Assigned to me" },
                  { id: "none", name: "Unassigned" },
                  ...(project?.members ?? []).map((m) => ({ id: m.id, name: m.name })),
                ].map((o) => (
                  <button
                    key={o.id || "any"}
                    type="button"
                    onClick={() => {
                      close();
                      setParams({ assignee: o.id || null });
                    }}
                    className={clsx(
                      "flex w-full px-3 py-1.5 text-left hover:bg-tk-subtle dark:hover:bg-tk-dark-subtle",
                      assignee === o.id && "font-semibold text-tk-accent dark:text-[#5eead4]"
                    )}
                  >
                    {o.name}
                  </button>
                ))}
              </div>
            )}
          </Popover>

          <Popover
            align="right"
            width={200}
            trigger={({ toggle }) => (
              <FilterButton onClick={toggle}>{SORT_LABEL[sort]}</FilterButton>
            )}
          >
            {(close) => (
              <div className="py-1">
                {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      close();
                      setParams({ sort: s === "updated" ? null : s });
                    }}
                    className={clsx(
                      "flex w-full px-3 py-1.5 text-left hover:bg-tk-subtle dark:hover:bg-tk-dark-subtle",
                      sort === s && "font-semibold text-tk-accent dark:text-[#5eead4]"
                    )}
                  >
                    {SORT_LABEL[s]}
                  </button>
                ))}
              </div>
            )}
          </Popover>
        </div>

        {labelIds.length > 0 && project && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {labelIds.map((id) => {
              const l = project.labels.find((x) => x.id === id);
              if (!l) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setParams({ label: labelIds.filter((x) => x !== id).join(",") || null })}
                  className="inline-flex items-center gap-1"
                  title="Remove filter"
                >
                  <LabelChip name={l.name} color={l.color} size="sm" />
                  <X className="h-3 w-3 text-tk-faint" />
                </button>
              );
            })}
            <button type="button" onClick={() => setParams({ label: null, assignee: null, q: null })} className="ml-1 text-xs text-tk-muted underline">
              Clear filters
            </button>
          </div>
        )}

        {/* Tab state (List & Calendar) */}
        {view !== "board" && (
          <div className="mt-3 flex gap-4 border-b border-tk-divider dark:border-tk-dark-divider">
            {(["open", "closed", "all"] as State[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setParams({ state: s === "open" ? null : s })}
                className={clsx(
                  "-mb-px flex items-center gap-1.5 border-b-2 px-1 py-2 text-sm capitalize",
                  state === s
                    ? "border-tk-accent font-semibold text-tk-text dark:border-[#5eead4] dark:text-tk-dark-text"
                    : "border-transparent text-tk-muted hover:text-tk-text dark:text-tk-dark-muted"
                )}
              >
                {s}
                <span className="rounded-full bg-tk-subtle px-1.5 text-xs tabular-nums text-tk-muted dark:bg-tk-dark-subtle dark:text-tk-dark-muted">
                  {data?.counts[s] ?? "–"}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Isi tampilan */}
        <div className="mt-3">
          {isLoading && !data ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : view === "board" && project ? (
            <IssueBoard projectId={projectId} project={project} issues={data?.issues ?? []} onOpen={openIssue} />
          ) : view === "calendar" ? (
            <IssueCalendar issues={data?.issues ?? []} onOpen={openIssue} />
          ) : !data?.issues.length ? (
            <div className="rounded-lg border border-tk-border bg-tk-surface dark:border-tk-dark-border dark:bg-tk-dark-surface">
              <EmptyState
                icon={Ticket}
                title={filtersActive ? "No issues match these filters" : state === "closed" ? "No closed issues yet" : "No open issues"}
                description={filtersActive ? "Try another search or clear the filters." : "Create an issue to start tracking work in this project."}
                action={!filtersActive && state !== "closed" ? <ButtonLink href={`${base}/issues/new`}>New issue</ButtonLink> : undefined}
              />
            </div>
          ) : (
            <ul className="divide-y divide-tk-divider overflow-hidden rounded-lg border border-tk-border bg-tk-surface dark:divide-tk-dark-divider dark:border-tk-dark-border dark:bg-tk-dark-surface">
              {data.issues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} statusName={statusName.get(issue.statusId)} onOpen={openIssue} />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Panel samping */}
      {peek && (
        <>
          <div className="fixed inset-0 z-60 bg-black/20" onClick={closePeek} />
          <aside className="fixed inset-y-0 right-0 z-70 w-full max-w-[820px] overflow-y-auto border-l border-tk-border bg-tk-surface shadow-xl dark:border-tk-dark-border dark:bg-tk-dark-surface">
            <IssueDetail projectId={projectId} number={Number(peek)} mode="peek" onClose={closePeek} currentUserId={currentUserId} />
          </aside>
        </>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm",
        active
          ? "border-tk-accent bg-tk-accent-soft text-tk-accent dark:border-[#5eead4]/50 dark:bg-tk-accent/20 dark:text-[#5eead4]"
          : "border-tk-border bg-tk-surface hover:bg-tk-subtle dark:border-tk-dark-border dark:bg-tk-dark-surface dark:hover:bg-tk-dark-subtle"
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
    </button>
  );
}
