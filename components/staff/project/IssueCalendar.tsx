"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dueState, type IssueListItem } from "../issue-ui";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// Kalender bulanan: issue ditaruh di tanggal due date-nya.
export default function IssueCalendar({ issues, onOpen }: { issues: IssueListItem[]; onOpen: (i: IssueListItem) => void }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const byDay = useMemo(() => {
    const map = new Map<string, IssueListItem[]>();
    for (const i of issues) {
      if (!i.dueDate) continue;
      const k = dayKey(new Date(i.dueDate));
      map.set(k, [...(map.get(k) ?? []), i]);
    }
    return map;
  }, [issues]);

  // Grid dimulai hari Senin.
  const first = new Date(cursor);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const weeks = cells[35].getMonth() !== cursor.getMonth() ? cells.slice(0, 35) : cells;
  const todayKey = dayKey(new Date());
  const withoutDue = issues.filter((i) => !i.dueDate).length;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="min-w-[150px] text-base font-semibold">
          {cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h2>
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="rounded-sm p-1 text-tk-muted hover:bg-tk-subtle dark:hover:bg-tk-dark-subtle"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="rounded-sm p-1 text-tk-muted hover:bg-tk-subtle dark:hover:bg-tk-dark-subtle"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            const d = new Date();
            setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
          }}
          className="h-7 rounded-md border border-tk-border px-2 text-xs hover:bg-tk-subtle dark:border-tk-dark-border dark:hover:bg-tk-dark-subtle"
        >
          Today
        </button>
        {withoutDue > 0 && <span className="ml-auto text-xs text-tk-faint">{withoutDue} without a due date aren&apos;t shown</span>}
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-tk-border bg-tk-surface dark:border-tk-dark-border dark:bg-tk-dark-surface">
        {DAYS.map((d) => (
          <div key={d} className="border-b border-tk-divider bg-tk-subtle px-2 py-1.5 text-xs font-semibold text-tk-muted dark:border-tk-dark-divider dark:bg-tk-dark-subtle dark:text-tk-dark-muted">
            {d}
          </div>
        ))}
        {weeks.map((date) => {
          const inMonth = date.getMonth() === cursor.getMonth();
          const k = dayKey(date);
          const items = byDay.get(k) ?? [];
          return (
            <div
              key={k}
              className={clsx(
                "min-h-[104px] border-b border-r border-tk-divider p-1.5 dark:border-tk-dark-divider",
                !inMonth && "bg-tk-subtle/50 dark:bg-tk-dark-subtle/30"
              )}
            >
              <span
                className={clsx(
                  "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-xs",
                  k === todayKey ? "bg-tk-accent font-semibold text-white" : inMonth ? "text-tk-muted dark:text-tk-dark-muted" : "text-tk-faint"
                )}
              >
                {date.getDate()}
              </span>
              <div className="mt-1 space-y-1">
                {items.slice(0, 3).map((i) => {
                  const late = dueState(i.dueDate, !!i.closedAt) === "late";
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => onOpen(i)}
                      title={`#${i.number} ${i.title}`}
                      className={clsx(
                        "block w-full truncate rounded-sm border-l-2 px-1.5 py-0.5 text-left text-xs",
                        i.closedAt
                          ? "border-tk-faint bg-tk-subtle text-tk-muted line-through dark:bg-tk-dark-subtle"
                          : late
                            ? "border-tk-red bg-tk-red-soft dark:bg-tk-red/15"
                            : "border-tk-accent bg-tk-accent-soft dark:bg-tk-accent/20"
                      )}
                    >
                      #{i.number} {i.title}
                    </button>
                  );
                })}
                {items.length > 3 && <p className="px-1 text-xs text-tk-faint">+{items.length - 3} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
