"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import { Skeleton } from "components/ui/kit";
import { projectBase, sendJson, useProject, type ProjectLabel } from "../hooks";
import { invalidateIssueLists } from "./IssueDetail";
import { DescriptionEditor } from "./Markdown";
import { AssigneePicker, DueDatePicker, LabelPicker, StatusPicker } from "./pickers";

export default function NewIssueForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { data: project, mutate: refreshProject } = useProject(projectId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState<string | null>(params.get("status"));
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!project) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  const base = projectBase(project.project);
  const status = statusId ?? project.statuses[0]?.id ?? "";

  const createLabel = async (name: string, color: string) => {
    const label = (await sendJson(`/api/projects/${projectId}/labels`, "POST", { name, color })) as ProjectLabel;
    await refreshProject();
    return label;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Add a title for this issue.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const { number } = await sendJson(`/api/projects/${projectId}/issues`, "POST", {
        title,
        description,
        statusId: status,
        assigneeId,
        labelIds,
        dueDate,
      });
      await Promise.all([invalidateIssueLists(projectId), globalMutate("/api/me/projects")]);
      toast.success(`Issue #${number} created`);
      router.push(`${base}/issues/${number}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the issue");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="space-y-4">
        <div>
          <label htmlFor="issue-title" className="mb-1 block text-sm font-semibold">
            Title
          </label>
          <input
            id="issue-title"
            autoFocus
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError("");
            }}
            maxLength={200}
            placeholder="Short summary, e.g. reboot compute-1 JAH, hardware power issue"
            className="h-10 w-full rounded-md border border-tk-border bg-tk-surface px-3 text-base focus:border-tk-accent focus:outline-hidden focus:ring-2 focus:ring-tk-accent/20 dark:border-tk-dark-border dark:bg-tk-dark-surface"
          />
          {error && <p className="mt-1 text-sm text-tk-red dark:text-[#fca5a5]">{error}</p>}
        </div>
        <div>
          <span className="mb-1 block text-sm font-semibold">Description</span>
          <DescriptionEditor value={description} onChange={setDescription} minRows={10} />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="h-9 rounded-md bg-tk-accent px-4 text-sm font-medium text-white hover:bg-tk-accent-hover disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create issue"}
          </button>
          <Link href={`${base}/issues`} className="inline-flex h-9 items-center rounded-md border border-tk-border px-4 text-sm hover:bg-tk-subtle dark:border-tk-dark-border dark:hover:bg-tk-dark-subtle">
            Cancel
          </Link>
        </div>
      </div>

      <aside className="space-y-4 text-sm lg:border-l lg:border-tk-divider lg:pl-5 dark:lg:border-tk-dark-divider">
        <Field label="Status">
          <StatusPicker statuses={project.statuses} value={status} onChange={setStatusId} />
        </Field>
        <Field label="Assignee">
          <AssigneePicker members={project.members} value={assigneeId} onChange={setAssigneeId} />
        </Field>
        <Field label="Labels">
          <LabelPicker labels={project.labels} value={labelIds} onChange={setLabelIds} onCreate={createLabel} />
        </Field>
        <Field label="Due date">
          <DueDatePicker value={dueDate} onChange={setDueDate} />
        </Field>
      </aside>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 px-2 text-xs font-semibold text-tk-muted dark:text-tk-dark-muted">{label}</p>
      {children}
    </div>
  );
}
