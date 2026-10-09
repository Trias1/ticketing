"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR, { mutate as globalMutate } from "swr";
import clsx from "clsx";
import { toast } from "sonner";
import { CircleCheck, Circle, Maximize2, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { Avatar, ConfirmDialog, Skeleton, formatDate, timeAgo } from "components/ui/kit";
import { fetcher, projectBase, sendJson, useProject, type ProjectLabel } from "../hooks";
import { ActivityIcon, activityText, DueBadge } from "../issue-ui";
import { AssigneePicker, DueDatePicker, LabelPicker, StatusPicker } from "./pickers";
import { DescriptionEditor, MarkdownView } from "./Markdown";
import Popover from "./Popover";

type IssueResponse = {
  issue: {
    id: string;
    number: number;
    title: string;
    description: string;
    labels: string[];
    statusId: string;
    dueDate: string | null;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
    closedByName: string | null;
    checklist: { done: number; total: number } | null;
    assignee: { id: string; name: string; avatarUrl: string | null } | null;
    author: { id: string; name: string; avatarUrl: string | null } | null;
  };
  comments: { id: string; body: string; createdAt: string; authorId: string | null; authorName: string | null; authorAvatar: string | null }[];
  events: { id: string; type: string; data: Record<string, unknown> | null; createdAt: string; actorName: string | null; actorAvatar: string | null }[];
  canDelete: boolean;
};

const TASK_RE = /^[ \t]*[-*][ \t]+\[( |x|X)\][ \t]+(.*)$/gm;

export function invalidateIssueLists(projectId: string) {
  return globalMutate(
    (key) =>
      typeof key === "string" &&
      (key.startsWith(`/api/projects/${projectId}/issues?`) || key.startsWith("/api/me/")),
    undefined,
    { revalidate: true }
  );
}

export default function IssueDetail({
  projectId,
  number,
  mode,
  onClose,
  currentUserId,
}: {
  projectId: string;
  number: number;
  mode: "peek" | "page";
  onClose?: () => void;
  currentUserId?: string;
}) {
  const router = useRouter();
  const key = `/api/projects/${projectId}/issues/${number}`;
  const { data, error, mutate } = useSWR<IssueResponse>(key, fetcher);
  const { data: project, mutate: refreshProject } = useProject(projectId);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editingDesc, setEditingDesc] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [newTask, setNewTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const tasks = useMemo(() => {
    const desc = data?.issue.description ?? "";
    return Array.from(desc.matchAll(TASK_RE)).map((m, index) => ({ index, checked: m[1].toLowerCase() === "x", text: m[2] }));
  }, [data?.issue.description]);

  const timeline = useMemo(() => {
    if (!data) return [];
    const items = [
      ...data.comments.map((c) => ({ kind: "comment" as const, at: c.createdAt, c })),
      ...data.events.map((e) => ({ kind: "event" as const, at: e.createdAt, e })),
    ];
    return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [data]);

  if (error) {
    return (
      <div className="p-6 text-sm text-tk-muted">
        {error.message}
        {onClose && (
          <button type="button" onClick={onClose} className="ml-2 underline">
            Close
          </button>
        )}
      </div>
    );
  }
  if (!data || !project) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const { issue } = data;
  const closed = !!issue.closedAt;
  const fullHref = `${projectBase(project.project)}/issues/${issue.number}`;

  const patch = async (body: Record<string, unknown>, message?: string) => {
    setBusy(true);
    try {
      await sendJson(key, "PATCH", body);
      await Promise.all([mutate(), invalidateIssueLists(projectId), globalMutate("/api/me/projects")]);
      if (message) toast.success(message);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save changes");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const createLabel = async (name: string, color: string) => {
    const label = (await sendJson(`/api/projects/${projectId}/labels`, "POST", { name, color })) as ProjectLabel;
    await refreshProject();
    return label;
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await sendJson(`${key}/comments`, "POST", { body: comment });
      setComment("");
      await Promise.all([mutate(), invalidateIssueLists(projectId)]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't post comment");
    } finally {
      setBusy(false);
    }
  };

  const deleteComment = async (id: string) => {
    try {
      await sendJson(`${key}/comments/${id}`, "DELETE");
      await Promise.all([mutate(), invalidateIssueLists(projectId)]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete comment");
    }
  };

  const addTask = async () => {
    const text = newTask.trim();
    if (!text) return;
    const desc = issue.description.trimEnd();
    const ok = await patch({ description: `${desc}${desc ? "\n" : ""}- [ ] ${text}` });
    if (ok) setNewTask("");
  };

  const deleteIssue = async () => {
    try {
      await sendJson(key, "DELETE");
      await Promise.all([invalidateIssueLists(projectId), globalMutate("/api/me/projects")]);
      toast.success(`Issue #${issue.number} deleted`);
      if (mode === "peek") onClose?.();
      else router.push(`${projectBase(project.project)}/issues`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete issue");
    }
  };

  const doneCount = tasks.filter((t) => t.checked).length;

  return (
    <div className="flex min-h-full flex-col">
      {/* Toolbar */}
      <div
        className={clsx(
          "flex items-center justify-between gap-2 border-b border-tk-divider px-5 py-2.5 dark:border-tk-dark-divider",
          mode === "peek" && "sticky top-0 z-10 bg-tk-surface dark:bg-tk-dark-surface"
        )}
      >
        <div className="flex min-w-0 items-center gap-2 text-sm text-tk-muted dark:text-tk-dark-muted">
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-sm p-1 hover:bg-tk-subtle dark:hover:bg-tk-dark-subtle" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="truncate">{project.project.name}</span>
          <span className="text-tk-faint">#{issue.number}</span>
        </div>
        <div className="flex items-center gap-1">
          {mode === "peek" && (
            <Link
              href={fullHref}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-tk-muted hover:bg-tk-subtle dark:text-tk-dark-muted dark:hover:bg-tk-dark-subtle"
            >
              <Maximize2 className="h-4 w-4" /> Open full page
            </Link>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => patch({ state: closed ? "open" : "closed" }, closed ? `Reopened #${issue.number}` : `Closed #${issue.number}`)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-tk-border px-3 text-sm font-medium hover:bg-tk-subtle disabled:opacity-60 dark:border-tk-dark-border dark:hover:bg-tk-dark-subtle"
          >
            {closed ? <Circle className="h-4 w-4" /> : <CircleCheck className="h-4 w-4" />}
            {closed ? "Reopen" : "Close issue"}
          </button>
          {data.canDelete && (
            <Popover
              align="right"
              width={180}
              trigger={({ toggle }) => (
                <button type="button" onClick={toggle} className="rounded-md p-2 text-tk-muted hover:bg-tk-subtle dark:hover:bg-tk-dark-subtle" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              )}
            >
              {(close) => (
                <button
                  type="button"
                  onClick={() => {
                    close();
                    setConfirmDelete(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-tk-red hover:bg-tk-red-soft dark:text-[#fca5a5] dark:hover:bg-tk-red/10"
                >
                  <Trash2 className="h-4 w-4" /> Delete issue
                </button>
              )}
            </Popover>
          )}
        </div>
      </div>

      <div className="grid flex-1 gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_240px]">
        {/* Main */}
        <div className="min-w-0">
          <span
            className={clsx(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              closed
                ? "bg-tk-subtle text-tk-muted dark:bg-tk-dark-subtle dark:text-tk-dark-muted"
                : "bg-tk-green-soft text-tk-green dark:bg-tk-green/20 dark:text-[#86efac]"
            )}
          >
            {closed ? <CircleCheck className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
            {closed ? "Closed" : "Open"}
          </span>

          {editingTitle !== null ? (
            <form
              className="mt-2 flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await patch({ title: editingTitle })) setEditingTitle(null);
              }}
            >
              <input
                autoFocus
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setEditingTitle(null)}
                maxLength={200}
                className="h-9 flex-1 rounded-md border border-tk-border bg-tk-surface px-3 text-lg font-semibold focus:border-tk-accent focus:outline-hidden focus:ring-2 focus:ring-tk-accent/20 dark:border-tk-dark-border dark:bg-tk-dark-surface"
              />
              <button type="submit" disabled={busy} className="h-9 rounded-md bg-tk-accent px-3 text-sm font-medium text-white hover:bg-tk-accent-hover">
                Save
              </button>
              <button type="button" onClick={() => setEditingTitle(null)} className="h-9 rounded-md border border-tk-border px-3 text-sm dark:border-tk-dark-border">
                Cancel
              </button>
            </form>
          ) : (
            <h2 className="group mt-2 flex items-start gap-2 text-xl font-semibold leading-snug">
              <span>{issue.title}</span>
              <button
                type="button"
                onClick={() => setEditingTitle(issue.title)}
                className="mt-1 rounded-sm p-1 text-tk-faint opacity-0 hover:bg-tk-subtle group-hover:opacity-100 dark:hover:bg-tk-dark-subtle"
                aria-label="Edit title"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </h2>
          )}
          <p className="mt-1 text-sm text-tk-muted dark:text-tk-dark-muted">
            Opened {timeAgo(issue.createdAt).toLowerCase()} by{" "}
            <span className="font-medium text-tk-text dark:text-tk-dark-text">{issue.author?.name ?? "a former member"}</span>
            {closed && issue.closedByName && ` · closed by ${issue.closedByName}`}
          </p>

          {/* Description */}
          <section className="mt-5">
            {editingDesc !== null ? (
              <div className="space-y-2">
                <DescriptionEditor value={editingDesc} onChange={setEditingDesc} />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      if (await patch({ description: editingDesc })) setEditingDesc(null);
                    }}
                    className="h-8 rounded-md bg-tk-accent px-3 text-sm font-medium text-white hover:bg-tk-accent-hover disabled:opacity-60"
                  >
                    Save description
                  </button>
                  <button type="button" onClick={() => setEditingDesc(null)} className="h-8 rounded-md border border-tk-border px-3 text-sm dark:border-tk-dark-border">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="group relative">
                {issue.description.replace(TASK_RE, "").trim() ? (
                  <MarkdownView source={issue.description} hideTasks />
                ) : (
                  <p className="text-sm italic text-tk-faint">No description.</p>
                )}
                <button
                  type="button"
                  onClick={() => setEditingDesc(issue.description)}
                  className="mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-tk-muted hover:bg-tk-subtle dark:text-tk-dark-muted dark:hover:bg-tk-dark-subtle"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit description
                </button>
              </div>
            )}
          </section>

          {/* Checklist */}
          <section className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Checklist</h3>
              {tasks.length > 0 && (
                <span className="text-xs text-tk-muted dark:text-tk-dark-muted">
                  {doneCount} of {tasks.length}
                </span>
              )}
            </div>
            {tasks.length > 0 && (
              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-tk-divider dark:bg-tk-dark-subtle">
                <div className="h-full rounded-full bg-tk-accent transition-[width]" style={{ width: `${(doneCount / tasks.length) * 100}%` }} />
              </div>
            )}
            <ul>
              {tasks.map((t) => (
                <li key={t.index}>
                  <label className="flex cursor-pointer items-start gap-2 rounded-sm px-1 py-1 text-sm hover:bg-tk-subtle dark:hover:bg-tk-dark-subtle">
                    <input
                      type="checkbox"
                      checked={t.checked}
                      disabled={busy}
                      onChange={(e) => patch({ checklist: { index: t.index, checked: e.target.checked } })}
                      className="mt-0.5 h-4 w-4 accent-tk-accent"
                    />
                    <span className={clsx(t.checked && "text-tk-muted line-through dark:text-tk-dark-muted")}>{t.text}</span>
                  </label>
                </li>
              ))}
            </ul>
            <form
              className="mt-1 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addTask();
              }}
            >
              <Plus className="h-4 w-4 text-tk-faint" />
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add an item"
                className="h-8 flex-1 bg-transparent text-sm outline-hidden placeholder:text-tk-faint"
              />
            </form>
          </section>

          {/* Activity */}
          <section className="mt-6 border-t border-tk-divider pt-4 dark:border-tk-dark-divider">
            <h3 className="mb-3 text-sm font-semibold">Activity</h3>
            <ol className="space-y-3">
              {timeline.map((item) =>
                item.kind === "event" ? (
                  <li key={item.e.id} className="flex gap-3 text-sm text-tk-muted dark:text-tk-dark-muted">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-tk-faint">
                      <ActivityIcon type={item.e.type} />
                    </span>
                    <span>
                      <span className="font-medium text-tk-text dark:text-tk-dark-text">{item.e.actorName ?? "Someone"}</span> {activityText(item.e)}
                      <span className="text-tk-faint"> · {timeAgo(item.e.createdAt).toLowerCase()}</span>
                    </span>
                  </li>
                ) : (
                  <li key={item.c.id} className="flex gap-3">
                    <Avatar name={item.c.authorName} src={item.c.authorAvatar} size={26} />
                    <div className="min-w-0 flex-1 rounded-md border border-tk-border dark:border-tk-dark-border">
                      <div className="flex items-center justify-between border-b border-tk-divider bg-tk-subtle px-3 py-1.5 text-xs text-tk-muted dark:border-tk-dark-divider dark:bg-tk-dark-subtle dark:text-tk-dark-muted">
                        <span>
                          <span className="font-medium text-tk-text dark:text-tk-dark-text">{item.c.authorName ?? "Former member"}</span> ·{" "}
                          {timeAgo(item.c.createdAt).toLowerCase()}
                        </span>
                        {(item.c.authorId === currentUserId || project.role === "owner") && (
                          <button
                            type="button"
                            onClick={() => deleteComment(item.c.id)}
                            className="rounded-sm p-0.5 text-tk-faint hover:text-tk-red"
                            aria-label="Delete comment"
                            title="Delete comment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="px-3 py-2">
                        <MarkdownView source={item.c.body} />
                      </div>
                    </div>
                  </li>
                )
              )}
            </ol>

            <div className="mt-4 rounded-md border border-tk-border focus-within:border-tk-accent focus-within:ring-2 focus-within:ring-tk-accent/20 dark:border-tk-dark-border">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendComment();
                }}
                rows={3}
                placeholder="Write a comment. Markdown supported."
                className="block w-full resize-y rounded-t-md bg-transparent px-3 py-2 text-sm outline-hidden placeholder:text-tk-faint"
              />
              <div className="flex items-center justify-between border-t border-tk-divider px-3 py-2 dark:border-tk-dark-divider">
                <span className="text-xs text-tk-faint">Ctrl + Enter to send</span>
                <button
                  type="button"
                  disabled={busy || !comment.trim()}
                  onClick={sendComment}
                  className="h-8 rounded-md bg-tk-accent px-3 text-sm font-medium text-white hover:bg-tk-accent-hover disabled:opacity-50"
                >
                  Comment
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Properties */}
        <aside className="space-y-4 text-sm lg:border-l lg:border-tk-divider lg:pl-5 dark:lg:border-tk-dark-divider">
          <Property label="Status">
            <StatusPicker statuses={project.statuses} value={issue.statusId} onChange={(statusId) => patch({ statusId })} />
          </Property>
          <Property label="Assignee">
            <AssigneePicker members={project.members} value={issue.assignee?.id ?? null} fallback={issue.assignee} onChange={(assigneeId) => patch({ assigneeId })} />
          </Property>
          <Property label="Labels">
            <LabelPicker labels={project.labels} value={issue.labels} onChange={(labelIds) => patch({ labelIds })} onCreate={createLabel} />
          </Property>
          <Property label="Due date">
            <DueDatePicker value={issue.dueDate} onChange={(dueDate) => patch({ dueDate })} />
            {issue.dueDate && (
              <div className="mt-1 px-2">
                <DueBadge dueDate={issue.dueDate} closed={closed} />
              </div>
            )}
          </Property>
          <Property label="Details">
            <dl className="space-y-1 px-2 text-xs text-tk-muted dark:text-tk-dark-muted">
              <div className="flex justify-between">
                <dt>Reference</dt>
                <dd className="font-mono">#{issue.number}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Created</dt>
                <dd>{formatDate(issue.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Updated</dt>
                <dd>{timeAgo(issue.updatedAt)}</dd>
              </div>
            </dl>
          </Property>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete issue #${issue.number}?`}
        description="The issue, its comments, and its history will be removed permanently."
        confirmLabel="Delete issue"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          deleteIssue();
        }}
      />
    </div>
  );
}

function Property({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 px-2 text-xs font-semibold text-tk-muted dark:text-tk-dark-muted">{label}</p>
      {children}
    </div>
  );
}

