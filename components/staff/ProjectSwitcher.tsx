"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, ChevronsUpDown, LayoutGrid, Plus, Search } from "lucide-react";
import { ProjectAvatar, TEAM_LABEL } from "components/ui/kit";
import { projectBase, useCurrentProject, useMyProjects, type MyProject } from "./hooks";

// Pemilih project ala workspace switcher: dikelompokkan per tim, bisa dicari.
export default function ProjectSwitcher({ collapsed, homeTeam }: { collapsed: boolean; homeTeam: string }) {
  const router = useRouter();
  const { data: projects = [] } = useMyProjects();
  const { project: current } = useCurrentProject();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => projects.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase())),
    [projects, query]
  );
  const groups = useMemo(() => {
    const map = new Map<string, MyProject[]>();
    for (const p of filtered) map.set(p.team, [...(map.get(p.team) ?? []), p]);
    return [...map.entries()];
  }, [filtered]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    inputRef.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const go = (p: MyProject) => {
    setOpen(false);
    router.push(`${projectBase(p)}/issues`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    }
    if (e.key === "Enter" && filtered[cursor]) go(filtered[cursor]);
  };

  const label = current?.name ?? "Select a project";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={collapsed ? label : undefined}
        className={clsx(
          "flex w-full items-center gap-2 rounded-md p-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5",
          collapsed && "justify-center"
        )}
      >
        {current ? (
          <ProjectAvatar name={current.name} color={current.color} icon={current.icon} size={28} />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-dashed border-tk-border text-tk-faint dark:border-tk-dark-border">
            <LayoutGrid className="h-3.5 w-3.5" />
          </span>
        )}
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold leading-tight">{label}</span>
              <span className="block text-xs leading-tight text-tk-muted dark:text-tk-dark-muted">
                {current ? TEAM_LABEL[current.team] ?? current.team : `${projects.length} ${projects.length === 1 ? "project" : "projects"}`}
              </span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-tk-faint" />
          </>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 z-50 mt-1 w-72 overflow-hidden rounded-lg border border-tk-border bg-tk-surface shadow-lg dark:border-tk-dark-border dark:bg-tk-dark-surface"
          onKeyDown={onKeyDown}
        >
          <div className="border-b border-tk-divider p-2 dark:border-tk-dark-divider">
            <label className="flex h-8 items-center gap-2 rounded-md border border-tk-border px-2 dark:border-tk-dark-border">
              <Search className="h-4 w-4 text-tk-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                placeholder="Search projects"
                className="w-full bg-transparent text-sm outline-hidden placeholder:text-tk-faint"
              />
            </label>
          </div>

          <div className="max-h-80 overflow-y-auto py-1" role="listbox">
            {groups.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-tk-muted dark:text-tk-dark-muted">
                {projects.length === 0 ? "You're not in any project yet." : "No matching projects."}
              </p>
            )}
            {groups.map(([team, items]) => (
              <div key={team}>
                <p className="px-3 pb-1 pt-2 text-xs font-semibold text-tk-faint">{TEAM_LABEL[team] ?? team}</p>
                {items.map((p) => {
                  const index = filtered.indexOf(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      aria-selected={current?.id === p.id}
                      onClick={() => go(p)}
                      onMouseEnter={() => setCursor(index)}
                      className={clsx(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
                        index === cursor && "bg-tk-subtle dark:bg-tk-dark-subtle"
                      )}
                    >
                      <ProjectAvatar name={p.name} color={p.color} icon={p.icon} size={20} />
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      {current?.id === p.id && <Check className="h-4 w-4 text-tk-accent dark:text-[#5eead4]" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="border-t border-tk-divider py-1 text-sm dark:border-tk-dark-divider">
            <Link
              href={`/dashboard/${homeTeam}/project/new`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-tk-subtle dark:hover:bg-tk-dark-subtle"
            >
              <Plus className="h-4 w-4 text-tk-muted" /> New project
            </Link>
            <Link
              href={`/dashboard/${homeTeam}/project`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-tk-subtle dark:hover:bg-tk-dark-subtle"
            >
              <LayoutGrid className="h-4 w-4 text-tk-muted" /> View all projects
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
