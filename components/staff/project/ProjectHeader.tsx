"use client";

import { Star } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
import clsx from "clsx";
import { sendJson, useProject } from "../hooks";

// Tombol bintang project. Nama project sudah tampil di switcher & breadcrumb, jadi halaman tidak punya header besar.
export function StarButton({ projectId }: { projectId: string }) {
  const { data, mutate: refresh } = useProject(projectId);
  if (!data) return null;
  const { starred } = data;

  const toggle = async () => {
    try {
      await sendJson(`/api/projects/${projectId}/star`, "POST", { starred: !starred });
      await Promise.all([refresh(), mutate("/api/me/projects")]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update star");
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={starred}
      title={starred ? "Unstar project" : "Star project"}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-tk-border bg-tk-surface px-2.5 text-sm hover:bg-tk-subtle dark:border-tk-dark-border dark:bg-tk-dark-surface dark:hover:bg-tk-dark-subtle"
    >
      <Star className={clsx("h-4 w-4", starred ? "fill-current text-[#ca8a04]" : "text-tk-muted")} />
      {starred ? "Starred" : "Star"}
    </button>
  );
}

// Judul halaman di dalam project (Activity, Members, Labels, Settings).
export default function PageTitle({ title, count, actions }: { title: string; count?: number; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-tk-divider pb-4 dark:border-tk-dark-divider">
      <h1 className="text-2xl font-semibold tracking-tight">
        {title}
        {count !== undefined && <span className="ml-2 text-base font-normal text-tk-muted dark:text-tk-dark-muted">{count}</span>}
      </h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
