"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Check, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, LabelChip } from "components/ui/kit";
import { LABEL_COLORS } from "./label-colors";
import Popover from "./Popover";
import type { ProjectLabel, ProjectMember, ProjectStatus } from "../hooks";

const fieldTrigger =
  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-tk-subtle dark:hover:bg-tk-dark-subtle";

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex h-8 items-center gap-2 border-b border-tk-divider px-2 dark:border-tk-dark-divider">
      <Search className="h-3.5 w-3.5 text-tk-faint" />
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-hidden placeholder:text-tk-faint"
      />
    </label>
  );
}

function Option({ selected, onClick, children }: { selected?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-tk-subtle dark:hover:bg-tk-dark-subtle"
    >
      <span className="w-4 shrink-0">{selected && <Check className="h-4 w-4 text-tk-accent dark:text-[#5eead4]" />}</span>
      {children}
    </button>
  );
}

export function StatusPicker({
  statuses,
  value,
  onChange,
  disabled,
}: {
  statuses: ProjectStatus[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const current = statuses.find((s) => s.id === value);
  return (
    <Popover
      width={220}
      trigger={({ toggle }) => (
        <button type="button" disabled={disabled} onClick={toggle} className={fieldTrigger}>
          <span className="rounded-sm bg-tk-accent-soft px-1.5 text-tk-accent dark:bg-tk-accent/25 dark:text-[#5eead4]">
            {current?.name ?? "No column"}
          </span>
        </button>
      )}
    >
      {(close) => (
        <div className="py-1">
          {statuses.map((s) => (
            <Option
              key={s.id}
              selected={s.id === value}
              onClick={() => {
                close();
                if (s.id !== value) onChange(s.id);
              }}
            >
              {s.name}
            </Option>
          ))}
        </div>
      )}
    </Popover>
  );
}

export function AssigneePicker({
  members,
  value,
  onChange,
  placeholder = "Unassigned",
  fallback,
}: {
  members: ProjectMember[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  fallback?: { id: string; name: string; avatarUrl: string | null } | null;
}) {
  const [query, setQuery] = useState("");
  const current = members.find((m) => m.id === value) ?? (fallback && fallback.id === value ? fallback : undefined);
  const filtered = members.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <Popover
      width={240}
      onOpenChange={() => setQuery("")}
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} className={fieldTrigger}>
          {current ? (
            <span className="flex items-center gap-2">
              <Avatar name={current.name} src={current.avatarUrl} size={20} />
              {current.name}
            </span>
          ) : (
            <span className="text-tk-muted dark:text-tk-dark-muted">{placeholder}</span>
          )}
        </button>
      )}
    >
      {(close) => (
        <>
          <SearchBox value={query} onChange={setQuery} placeholder="Search members" />
          <div className="max-h-64 overflow-y-auto py-1">
            <Option
              selected={!value}
              onClick={() => {
                close();
                if (value) onChange(null);
              }}
            >
              <span className="text-tk-muted dark:text-tk-dark-muted">Unassigned</span>
            </Option>
            {filtered.map((m) => (
              <Option
                key={m.id}
                selected={m.id === value}
                onClick={() => {
                  close();
                  if (m.id !== value) onChange(m.id);
                }}
              >
                <Avatar name={m.name} src={m.avatarUrl} size={20} />
                <span className="truncate">{m.name}</span>
              </Option>
            ))}
          </div>
        </>
      )}
    </Popover>
  );
}

export function LabelPicker({
  labels,
  value,
  onChange,
  onCreate,
  trigger,
}: {
  labels: ProjectLabel[];
  value: string[];
  onChange: (ids: string[]) => void;
  onCreate?: (name: string, color: string) => Promise<ProjectLabel>;
  trigger?: (toggle: () => void) => React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<string[] | null>(null);
  const selected = draft ?? value;
  const filtered = labels.filter((l) => l.name.toLowerCase().includes(query.trim().toLowerCase()));
  const exact = labels.some((l) => l.name.toLowerCase() === query.trim().toLowerCase());
  const chosen = useMemo(() => labels.filter((l) => value.includes(l.id)), [labels, value]);

  const toggleId = (id: string) =>
    setDraft((d) => {
      const base = d ?? value;
      return base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
    });

  // Perubahan label disimpan sekali saat popover ditutup, bukan tiap klik.
  const commit = () => {
    if (draft && (draft.length !== value.length || draft.some((id) => !value.includes(id)))) onChange(draft);
    setDraft(null);
    setQuery("");
  };

  const create = async () => {
    if (!onCreate) return;
    try {
      const color = LABEL_COLORS[labels.length % LABEL_COLORS.length];
      const label = await onCreate(query.trim(), color);
      setDraft((d) => [...(d ?? value), label.id]);
      setQuery("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create label");
    }
  };

  return (
    <Popover
      width={260}
      onOpenChange={(o) => !o && commit()}
      trigger={({ toggle }) =>
        trigger ? (
          trigger(toggle)
        ) : (
          <button type="button" onClick={toggle} className={clsx(fieldTrigger, "flex-wrap justify-start")}>
            {chosen.length ? (
              <span className="flex flex-wrap gap-1">
                {chosen.map((l) => (
                  <LabelChip key={l.id} name={l.name} color={l.color} size="sm" />
                ))}
              </span>
            ) : (
              <span className="text-tk-muted dark:text-tk-dark-muted">None</span>
            )}
          </button>
        )
      }
    >
      {() => (
        <>
          <SearchBox value={query} onChange={setQuery} placeholder="Search or create label" />
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.map((l) => (
              <Option key={l.id} selected={selected.includes(l.id)} onClick={() => toggleId(l.id)}>
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />
                <span className="truncate">{l.name}</span>
              </Option>
            ))}
            {filtered.length === 0 && !query && <p className="px-3 py-2 text-tk-muted">No labels yet.</p>}
            {onCreate && query.trim() && !exact && (
              <button
                type="button"
                onClick={create}
                className="flex w-full items-center gap-2 border-t border-tk-divider px-3 py-1.5 text-left text-tk-accent hover:bg-tk-subtle dark:border-tk-dark-divider dark:text-[#5eead4] dark:hover:bg-tk-dark-subtle"
              >
                <Plus className="h-4 w-4" /> Create &ldquo;{query.trim()}&rdquo;
              </button>
            )}
          </div>
        </>
      )}
    </Popover>
  );
}

export function DueDatePicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const dateValue = value ? new Date(value).toISOString().slice(0, 10) : "";
  return (
    <div className="flex items-center gap-1 px-2">
      <input
        type="date"
        value={dateValue}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-7 rounded-md border border-tk-border bg-tk-surface px-2 text-sm dark:border-tk-dark-border dark:bg-tk-dark-surface dark:scheme-dark"
        aria-label="Due date"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded-sm p-1 text-tk-faint hover:text-tk-text dark:hover:text-tk-dark-text"
          aria-label="Remove due date"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
