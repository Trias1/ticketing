"use client";

import Link from "next/link";
import clsx from "clsx";
import {
  ArrowRightLeft,
  CalendarDays,
  Circle,
  CircleCheck,
  CircleDot,
  MessageSquare,
  PenLine,
  Plus,
  RotateCcw,
  SquareCheck,
  Tag,
  UserRound,
} from "lucide-react";
import { Avatar, LabelChip, ProjectAvatar, timeAgo } from "components/ui/kit";

export type IssueListItem = {
  id: string;
  number: number;
  title: string;
  labels: string[];
  labelDetails: { id: string; name: string; color: string }[];
  statusId: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  projectId: string;
  projectName: string;
  projectSlug: string;
  projectTeam: string;
  projectColor: string;
  projectIcon: string | null;
  commentCount: number;
  checklist: { done: number; total: number } | null;
  assignee: { id: string; name: string; avatarUrl: string | null } | null;
  author: { id: string; name: string } | null;
};

export const issueHref = (i: { projectTeam: string; projectSlug: string; number: number }) =>
  `/dashboard/${i.projectTeam}/project/${i.projectSlug}/issues/${i.number}`;

const DAY = 24 * 60 * 60 * 1000;

export function dueState(dueDate: string | null, closed: boolean) {
  if (!dueDate || closed) return "normal" as const;
  const due = new Date(dueDate).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (due < today.getTime()) return "late" as const;
  if (due - today.getTime() <= 2 * DAY) return "soon" as const;
  return "normal" as const;
}

export function DueBadge({ dueDate, closed }: { dueDate: string | null; closed: boolean }) {
  if (!dueDate) return null;
  const state = dueState(dueDate, closed);
  return (
    <span
      title={state === "late" ? "Overdue" : state === "soon" ? "Due soon" : "Due date"}
      className={clsx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-xs",
        state === "late" && "bg-tk-red-soft text-tk-red dark:bg-tk-red/20 dark:text-[#fca5a5]",
        state === "soon" && "bg-tk-orange-soft text-tk-orange dark:bg-tk-orange/25 dark:text-[#fcd34d]",
        state === "normal" && "bg-tk-subtle text-tk-muted dark:bg-tk-dark-subtle dark:text-tk-dark-muted"
      )}
    >
      <CalendarDays className="h-3 w-3" />
      {new Date(dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
    </span>
  );
}

export function StateIcon({ closed, className }: { closed: boolean; className?: string }) {
  return closed ? (
    <CircleCheck className={clsx("h-4 w-4 text-tk-faint", className)} aria-label="Closed" />
  ) : (
    <Circle className={clsx("h-4 w-4 text-tk-green dark:text-[#86efac]", className)} aria-label="Open" />
  );
}

export function ChecklistBadge({ checklist }: { checklist: IssueListItem["checklist"] }) {
  if (!checklist) return null;
  const complete = checklist.done === checklist.total;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 text-xs",
        complete ? "text-tk-green dark:text-[#86efac]" : "text-tk-muted dark:text-tk-dark-muted"
      )}
      title="Checklist"
    >
      <SquareCheck className="h-3.5 w-3.5" />
      {checklist.done}/{checklist.total}
    </span>
  );
}

// Satu baris issue untuk tampilan List (per project maupun lintas project).
export function IssueRow({
  issue,
  statusName,
  showProject,
  onOpen,
  selectable,
  selected,
  onSelect,
}: {
  issue: IssueListItem;
  statusName?: string;
  showProject?: boolean;
  onOpen?: (issue: IssueListItem) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
}) {
  const closed = !!issue.closedAt;
  const title = (
    <span className="font-semibold text-tk-text hover:text-tk-accent dark:text-tk-dark-text dark:hover:text-[#5eead4]">
      {issue.title}
    </span>
  );

  return (
    <li className={clsx("group flex items-start gap-3 px-4 py-3 hover:bg-tk-subtle/70 dark:hover:bg-tk-dark-subtle/60", selected && "bg-tk-accent-soft/50 dark:bg-tk-accent/10")}>
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect?.(e.target.checked)}
          aria-label={`Select #${issue.number}`}
          className="mt-1 h-4 w-4 accent-tk-accent"
        />
      )}
      <StateIcon closed={closed} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {onOpen ? (
          <button type="button" onClick={() => onOpen(issue)} className="text-left">
            {title}
          </button>
        ) : (
          <Link href={issueHref(issue)}>{title}</Link>
        )}
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-xs text-tk-muted dark:text-tk-dark-muted">
          {showProject && (
            <span className="inline-flex items-center gap-1">
              <ProjectAvatar name={issue.projectName} color={issue.projectColor} icon={issue.projectIcon} size={14} />
              {issue.projectName} ·
            </span>
          )}
          <span>#{issue.number}</span>
          <span>·</span>
          <span>
            {closed ? `closed ${timeAgo(issue.closedAt).toLowerCase()}` : `opened ${timeAgo(issue.createdAt).toLowerCase()}`}
            {issue.author && ` by ${issue.author.name}`}
          </span>
        </p>
        {(issue.labelDetails.length > 0 || statusName || issue.checklist) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {issue.labelDetails.map((l) => (
              <LabelChip key={l.id} name={l.name} color={l.color} size="sm" />
            ))}
            {statusName && !closed && (
              <span className="ml-0.5 rounded-sm bg-tk-accent-soft px-1.5 text-xs text-tk-accent dark:bg-tk-accent/25 dark:text-[#5eead4]">
                {statusName}
              </span>
            )}
            <span className="ml-1">
              <ChecklistBadge checklist={issue.checklist} />
            </span>
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="flex items-center gap-3">
          <DueBadge dueDate={issue.dueDate} closed={closed} />
          {issue.assignee ? (
            <span title={`Assigned to ${issue.assignee.name}`}>
              <Avatar name={issue.assignee.name} src={issue.assignee.avatarUrl} size={22} />
            </span>
          ) : null}
          <span
            className={clsx(
              "inline-flex items-center gap-1 text-xs",
              issue.commentCount ? "text-tk-muted dark:text-tk-dark-muted" : "text-tk-faint/60"
            )}
            title={`${issue.commentCount} comments`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {issue.commentCount}
          </span>
        </div>
        <span className="text-xs text-tk-faint">updated {timeAgo(issue.updatedAt).toLowerCase()}</span>
      </div>
    </li>
  );
}

type ActivityEvent = {
  type: string;
  data: Record<string, unknown> | null;
  actorName: string | null;
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  created: Plus,
  closed: CircleCheck,
  reopened: RotateCcw,
  status: ArrowRightLeft,
  assignee: UserRound,
  labels: Tag,
  title: PenLine,
  due_date: CalendarDays,
  description: PenLine,
};

export function ActivityIcon({ type }: { type: string }) {
  const Icon = ICONS[type] ?? CircleDot;
  return <Icon className="h-4 w-4" />;
}

// Kalimat aktivitas, mis. "moved this to In Progress".
export function activityText(e: ActivityEvent) {
  const d = e.data ?? {};
  switch (e.type) {
    case "created":
      return "created this issue";
    case "closed":
      return "closed this issue";
    case "reopened":
      return "reopened this issue";
    case "status":
      return `moved this to ${d.to ?? "another column"}`;
    case "assignee":
      return d.to ? `assigned this to ${d.to}` : "removed the assignee";
    case "labels": {
      const added = (d.added as string[] | undefined) ?? [];
      const removed = (d.removed as string[] | undefined) ?? [];
      return [added.length ? `added ${added.join(", ")}` : "", removed.length ? `removed ${removed.join(", ")}` : ""]
        .filter(Boolean)
        .join(" and ");
    }
    case "title":
      return `changed the title to "${d.to ?? ""}"`;
    case "due_date":
      return d.to
        ? `set the due date to ${new Date(String(d.to)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
        : "removed the due date";
    case "description":
      return "edited the description";
    default:
      return e.type;
  }
}
