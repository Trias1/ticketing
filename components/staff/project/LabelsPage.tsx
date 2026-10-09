"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import clsx from "clsx";
import { toast } from "sonner";
import { Check, Plus, Tag } from "lucide-react";
import { ConfirmDialog, EmptyState, LabelChip, Skeleton } from "components/ui/kit";
import { fetcher, sendJson, useProject } from "../hooks";
import { LABEL_COLORS } from "./label-colors";
import PageTitle from "./ProjectHeader";

type Label = { id: string; name: string; color: string; description: string | null; openIssues: number };

function LabelEditor({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: { name: string; color: string; description: string };
  onSave: (v: { name: string; color: string; description: string }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const [description, setDescription] = useState(initial.description);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name, color, description });
      }}
      className="space-y-3 bg-tk-subtle/60 px-4 py-3 dark:bg-tk-dark-subtle/50"
    >
      <div className="flex flex-wrap items-center gap-3">
        <LabelChip name={name || "Label preview"} color={color} />
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required placeholder="Label name, e.g. JAH" className="h-8 w-48 rounded-md border border-tk-border bg-tk-surface px-2 text-sm focus:border-tk-accent focus:outline-hidden dark:border-tk-dark-border dark:bg-tk-dark-surface" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder="Description (optional)" className="h-8 min-w-[200px] flex-1 rounded-md border border-tk-border bg-tk-surface px-2 text-sm focus:border-tk-accent focus:outline-hidden dark:border-tk-dark-border dark:bg-tk-dark-surface" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {LABEL_COLORS.map((c) => (
          <button key={c} type="button" onClick={() => setColor(c)} aria-label={c} className={clsx("flex h-6 w-6 items-center justify-center rounded-sm", color === c && "ring-2 ring-tk-text ring-offset-1 dark:ring-tk-dark-text")} style={{ backgroundColor: c }}>
            {color === c && <Check className="h-3.5 w-3.5 text-white" />}
          </button>
        ))}
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Custom color" className="h-6 w-8 cursor-pointer rounded-sm border border-tk-border bg-transparent dark:border-tk-dark-border" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving || !name.trim()} className="h-8 rounded-md bg-tk-accent px-3 text-sm font-medium text-white hover:bg-tk-accent-hover disabled:opacity-60">
          {saving ? "Saving..." : "Save label"}
        </button>
        <button type="button" onClick={onCancel} className="h-8 rounded-md border border-tk-border px-3 text-sm dark:border-tk-dark-border">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function LabelsPage({ projectId }: { projectId: string }) {
  const key = `/api/projects/${projectId}/labels`;
  const { data: labels, isLoading, mutate } = useSWR<Label[]>(key, fetcher);
  const { data: project, mutate: refreshProject } = useProject(projectId);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Label | null>(null);
  const isOwner = project?.role === "owner";

  const save = async (id: string | "new", v: { name: string; color: string; description: string }) => {
    setSaving(true);
    try {
      if (id === "new") await sendJson(key, "POST", v);
      else await sendJson(`${key}/${id}`, "PATCH", v);
      await Promise.all([mutate(), refreshProject()]);
      setEditing(null);
      toast.success(id === "new" ? `Label ${v.name} created` : "Label updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save label");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (l: Label) => {
    try {
      await sendJson(`${key}/${l.id}`, "DELETE");
      await Promise.all([mutate(), refreshProject()]);
      toast.success(`Label ${l.name} deleted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete label");
    }
  };

  // Dari URL, supaya link valid walau data project belum selesai dimuat.
  const base = usePathname().replace(/\/labels$/, "");

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageTitle
          title="Labels"
          count={labels?.length}
          actions={
            <button type="button" onClick={() => setEditing("new")} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-tk-accent px-3 text-sm font-medium text-white hover:bg-tk-accent-hover">
              <Plus className="h-4 w-4" /> New label
            </button>
          }
        />

        <div className="overflow-hidden rounded-lg border border-tk-border bg-tk-surface dark:border-tk-dark-border dark:bg-tk-dark-surface">
          {editing === "new" && (
            <LabelEditor initial={{ name: "", color: LABEL_COLORS[(labels?.length ?? 0) % LABEL_COLORS.length], description: "" }} saving={saving} onCancel={() => setEditing(null)} onSave={(v) => save("new", v)} />
          )}
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !labels?.length && editing !== "new" ? (
            <EmptyState icon={Tag} title="No labels yet" description="Labels group issues, e.g. by site (JAH, TBS, TKP) or type (Bug, Feature)." />
          ) : (
            <ul className="divide-y divide-tk-divider dark:divide-tk-dark-divider">
              {labels?.map((l) =>
                editing === l.id ? (
                  <li key={l.id}>
                    <LabelEditor initial={{ name: l.name, color: l.color, description: l.description ?? "" }} saving={saving} onCancel={() => setEditing(null)} onSave={(v) => save(l.id, v)} />
                  </li>
                ) : (
                  <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                    <span className="w-40 shrink-0">
                      <LabelChip name={l.name} color={l.color} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-tk-muted dark:text-tk-dark-muted">{l.description || ""}</span>
                    <Link href={`${base}/issues?label=${l.id}`} className="text-sm text-tk-accent hover:underline dark:text-[#5eead4]">
                      {l.openIssues} open {l.openIssues === 1 ? "issue" : "issues"}
                    </Link>
                    <button type="button" onClick={() => setEditing(l.id)} className="h-8 rounded-md border border-tk-border px-3 text-sm hover:bg-tk-subtle dark:border-tk-dark-border dark:hover:bg-tk-dark-subtle">
                      Edit
                    </button>
                    {isOwner && (
                      <button type="button" onClick={() => setDeleting(l)} className="h-8 rounded-md border border-tk-border px-3 text-sm text-tk-red hover:bg-tk-red-soft dark:border-tk-dark-border dark:text-[#fca5a5] dark:hover:bg-tk-red/10">
                        Delete
                      </button>
                    )}
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleting}
        title={`Delete label ${deleting?.name ?? ""}?`}
        description="It's removed from every issue in this project. This can't be undone."
        confirmLabel="Delete label"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const l = deleting;
          setDeleting(null);
          if (l) remove(l);
        }}
      />
    </div>
  );
}
