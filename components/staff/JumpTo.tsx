"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import clsx from "clsx";
import { CircleCheck, Circle, FolderKanban, Home, Search, Ticket } from "lucide-react";
import { ProjectAvatar } from "components/ui/kit";
import { fetcher, projectBase, useMyProjects } from "./hooks";

type Hit = { number: number; title: string; closed: boolean; projectName: string; projectSlug: string; projectTeam: string };
type Item = { key: string; label: string; hint?: string; href: string; icon: React.ReactNode };

// Palet "Jump to…" (Ctrl/Cmd + K): pindah halaman, project, atau issue.
export default function JumpTo({ homeTeam, open, onClose }: { homeTeam: string; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { data: projectData } = useMyProjects();
  const projects = useMemo(() => projectData ?? [], [projectData]);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const q = query.trim();
  const { data: hits = [] } = useSWR<Hit[]>(open && q.length >= 2 ? `/api/me/search?q=${encodeURIComponent(q)}` : null, fetcher, {
    keepPreviousData: true,
  });

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const lower = q.toLowerCase();
    const pages: Item[] = [
      { key: "p:dash", label: "Dashboard", href: `/dashboard/${homeTeam}`, icon: <Home className="h-4 w-4" /> },
      { key: "p:mine", label: "My issues", href: `/dashboard/${homeTeam}/issues`, icon: <Ticket className="h-4 w-4" /> },
      { key: "p:projects", label: "Projects", href: `/dashboard/${homeTeam}/project`, icon: <FolderKanban className="h-4 w-4" /> },
    ].filter((p) => !lower || p.label.toLowerCase().includes(lower));
    const projectItems: Item[] = projects
      .filter((p) => !lower || p.name.toLowerCase().includes(lower))
      .slice(0, 6)
      .map((p) => ({
        key: `proj:${p.id}`,
        label: p.name,
        hint: "Project",
        href: `${projectBase(p)}/issues`,
        icon: <ProjectAvatar name={p.name} color={p.color} icon={p.icon} size={18} />,
      }));
    const issueItems: Item[] = hits.map((h) => ({
      key: `iss:${h.projectTeam}/${h.projectSlug}#${h.number}`,
      label: h.title,
      hint: `${h.projectName} #${h.number}`,
      href: `/dashboard/${h.projectTeam}/project/${h.projectSlug}/issues/${h.number}`,
      icon: h.closed ? <CircleCheck className="h-4 w-4 text-tk-faint" /> : <Circle className="h-4 w-4 text-tk-green" />,
    }));
    return [...pages, ...projectItems, ...issueItems];
  }, [q, projects, hits, homeTeam]);

  if (!open) return null;

  const go = (item?: Item) => {
    if (!item) return;
    onClose();
    router.push(item.href);
  };

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center bg-black/30 p-4 pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Jump to"
        className="w-full max-w-lg overflow-hidden rounded-lg border border-tk-border bg-tk-surface shadow-xl dark:border-tk-dark-border dark:bg-tk-dark-surface"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setCursor((c) => Math.min(c + 1, items.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => Math.max(c - 1, 0));
          }
          if (e.key === "Enter") go(items[cursor]);
        }}
      >
        <label className="flex items-center gap-2 border-b border-tk-divider px-3 dark:border-tk-dark-divider">
          <Search className="h-4 w-4 text-tk-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            placeholder="Jump to a page, project, or issue (#82)"
            className="h-11 w-full bg-transparent text-sm outline-hidden placeholder:text-tk-faint"
          />
        </label>
        <ul className="max-h-80 overflow-y-auto py-1">
          {items.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-tk-muted">{projectData ? "No results." : "Loading…"}</li>
          )}
          {items.map((item, i) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => go(item)}
                onMouseEnter={() => setCursor(i)}
                className={clsx(
                  "flex w-full items-center gap-3 px-3 py-2 text-left text-sm",
                  i === cursor && "bg-tk-subtle dark:bg-tk-dark-subtle"
                )}
              >
                <span className="text-tk-muted dark:text-tk-dark-muted">{item.icon}</span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint && <span className="shrink-0 text-xs text-tk-faint">{item.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
