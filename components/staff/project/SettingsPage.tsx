"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Skeleton } from "components/ui/kit";
import { projectBase, sendJson, useProject, type ProjectStatus } from "../hooks";
import { ProjectIdentityFields } from "../ProjectForm";
import PageTitle from "./ProjectHeader";

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-tk-divider py-6 last:border-b-0 dark:border-tk-dark-divider lg:grid-cols-3 lg:gap-8">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-tk-muted dark:text-tk-dark-muted">{description}</p>
      </div>
      <div className="lg:col-span-2">{children}</div>
    </section>
  );
}

export default function SettingsPage({ projectId, homeTeam }: { projectId: string; homeTeam: string }) {
  const router = useRouter();
  const { data, mutate } = useProject(projectId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#0f766e");
  const [icon, setIcon] = useState("");
  const [saving, setSaving] = useState(false);
  const [newColumn, setNewColumn] = useState("");
  const [renaming, setRenaming] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<ProjectStatus | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const [confirmName, setConfirmName] = useState("");

  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!data || loadedFor.current === data.project.id) return;
    loadedFor.current = data.project.id;
    setName(data.project.name);
    setDescription(data.project.description ?? "");
    setColor(data.project.color);
    setIcon(data.project.icon ?? "");
  }, [data]);

  if (!data) {
    return (
      <div className="space-y-3 px-8 py-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const isOwner = data.role === "owner";
  const statuses = [...data.statuses].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const refresh = () => Promise.all([mutate(), globalMutate("/api/me/projects")]);
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      await refresh();
      if (ok) toast.success(ok);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      return false;
    }
  };

  const saveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const result = await run(async () => {
      const { project } = await sendJson(`/api/projects/${projectId}`, "PATCH", { name, description, color, icon });
      if (project.slug !== data.project.slug) router.replace(`${projectBase(project)}/settings`);
    }, "Project updated");
    setSaving(false);
    return result;
  };

  const move = (index: number, dir: -1 | 1) => {
    const ids = statuses.map((s) => s.id);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => sendJson(`/api/projects/${projectId}/statuses`, "PUT", { ids }));
  };

  if (!isOwner) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <PageTitle title="Settings" />
          <p className="rounded-md border border-tk-border bg-tk-surface px-4 py-3 text-sm text-tk-muted dark:border-tk-dark-border dark:bg-tk-dark-surface dark:text-tk-dark-muted">
            Only project owners can change settings. Ask an owner if something needs to change.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <PageTitle title="Settings" />

        <Section title="General" description="Name, description, and how the project looks in the sidebar.">
          <form onSubmit={saveGeneral} className="space-y-4">
            <ProjectIdentityFields name={name} setName={setName} description={description} setDescription={setDescription} color={color} setColor={setColor} icon={icon} setIcon={setIcon} />
            <button type="submit" disabled={saving || !name.trim()} className="h-9 rounded-md bg-tk-accent px-4 text-sm font-medium text-white hover:bg-tk-accent-hover disabled:opacity-60">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </Section>

        <Section title="Board columns" description="Columns on the board, in order. Every open issue sits in one column.">
          <ul className="divide-y divide-tk-divider overflow-hidden rounded-lg border border-tk-border bg-tk-surface dark:divide-tk-dark-divider dark:border-tk-dark-border dark:bg-tk-dark-surface">
            {statuses.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2 px-3 py-2">
                <input
                  value={renaming[s.id] ?? s.name}
                  onChange={(e) => setRenaming((r) => ({ ...r, [s.id]: e.target.value }))}
                  onBlur={() => {
                    const next = renaming[s.id]?.trim();
                    if (next && next !== s.name) run(() => sendJson(`/api/projects/${projectId}/statuses/${s.id}`, "PATCH", { name: next }), "Column renamed");
                    setRenaming((r) => {
                      const { [s.id]: _omit, ...rest } = r;
                      return rest;
                    });
                  }}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  aria-label={`Column name ${s.name}`}
                  maxLength={50}
                  className="h-8 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm hover:border-tk-border focus:border-tk-accent focus:outline-hidden dark:hover:border-tk-dark-border"
                />
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-sm p-1.5 text-tk-muted hover:bg-tk-subtle disabled:opacity-30 dark:hover:bg-tk-dark-subtle" aria-label="Move up">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === statuses.length - 1} className="rounded-sm p-1.5 text-tk-muted hover:bg-tk-subtle disabled:opacity-30 dark:hover:bg-tk-dark-subtle" aria-label="Move down">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(s);
                    setMoveTo(statuses.find((x) => x.id !== s.id)?.id ?? "");
                  }}
                  disabled={statuses.length <= 1}
                  className="rounded-sm p-1.5 text-tk-muted hover:bg-tk-red-soft hover:text-tk-red disabled:opacity-30 dark:hover:bg-tk-red/10"
                  aria-label={`Delete column ${s.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newColumn.trim()) return;
              if (await run(() => sendJson(`/api/projects/${projectId}/statuses`, "POST", { name: newColumn }), "Column added")) setNewColumn("");
            }}
          >
            <input value={newColumn} onChange={(e) => setNewColumn(e.target.value)} maxLength={50} placeholder="New column, e.g. Review" className="h-8 flex-1 rounded-md border border-tk-border bg-tk-surface px-3 text-sm focus:border-tk-accent focus:outline-hidden dark:border-tk-dark-border dark:bg-tk-dark-surface" />
            <button type="submit" className="inline-flex h-8 items-center gap-1 rounded-md border border-tk-border px-3 text-sm hover:bg-tk-subtle dark:border-tk-dark-border dark:hover:bg-tk-dark-subtle">
              <Plus className="h-4 w-4" /> Add column
            </button>
          </form>

          {deleteTarget && (
            <div className="mt-3 space-y-2 rounded-md border border-[#fecaca] bg-tk-red-soft p-3 text-sm dark:border-tk-red/40 dark:bg-tk-red/10">
              <p>
                Delete <b>{deleteTarget.name}</b>? Issues in it move to:
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="h-8 rounded-md border border-tk-border bg-tk-surface px-2 dark:border-tk-dark-border dark:bg-tk-dark-surface">
                  {statuses
                    .filter((x) => x.id !== deleteTarget.id)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={async () => {
                    if (await run(() => sendJson(`/api/projects/${projectId}/statuses/${deleteTarget.id}?moveTo=${moveTo}`, "DELETE"), "Column deleted")) setDeleteTarget(null);
                  }}
                  className="h-8 rounded-md bg-tk-red px-3 font-medium text-white hover:bg-[#991b1b]"
                >
                  Delete column
                </button>
                <button type="button" onClick={() => setDeleteTarget(null)} className="h-8 rounded-md border border-tk-border bg-tk-surface px-3 dark:border-tk-dark-border dark:bg-tk-dark-surface">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Section>

        <Section title="Delete project" description="Removes the project with all its issues, comments, labels, and history.">
          <div className="space-y-3 rounded-lg border border-[#fecaca] p-4 dark:border-tk-red/40">
            <p className="text-sm">
              Type <b className="font-mono">{data.project.name}</b> to confirm.
            </p>
            <input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} aria-label="Project name to confirm" className="h-9 w-full rounded-md border border-tk-border bg-tk-surface px-3 text-sm focus:border-tk-red focus:outline-hidden dark:border-tk-dark-border dark:bg-tk-dark-surface" />
            <button
              type="button"
              disabled={confirmName !== data.project.name}
              onClick={async () => {
                if (await run(() => sendJson(`/api/projects/${projectId}`, "DELETE"), "Project deleted")) router.push(`/dashboard/${homeTeam}/project`);
              }}
              className="h-9 rounded-md bg-tk-red px-4 text-sm font-medium text-white hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Delete project
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
