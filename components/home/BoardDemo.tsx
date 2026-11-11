"use client";

import { useState } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { CalendarDays, MessageSquare } from "lucide-react";
import { Avatar, LabelChip } from "components/ui/kit";
import { ChecklistBadge } from "components/staff/issue-ui";

// Papan contoh di halaman home: data statis, hanya di browser, tidak ke server.
// Kolom dan label sama dengan bawaan project baru (lib/issues.ts).

type DemoIssue = {
  number: number;
  title: string;
  labels: { name: string; color: string }[];
  due?: string;
  checklist?: { done: number; total: number };
  comments?: number;
  assignee?: string;
};

const BUG = { name: "Bug", color: "#DC2626" };
const FEATURE = { name: "Feature", color: "#2563EB" };
const IMPROVEMENT = { name: "Improvement", color: "#7C3AED" };
const DOCS = { name: "Documentation", color: "#0891B2" };

const ISSUES: Record<number, DemoIssue> = {
  14: { number: 14, title: "Renew the TLS certificate for the status page", labels: [IMPROVEMENT], due: "Due Friday", assignee: "Rani Aditya" },
  17: { number: 17, title: "Export the sign-in log as CSV", labels: [FEATURE], checklist: { done: 0, total: 3 } },
  21: { number: 21, title: "Write the on-call handover checklist", labels: [DOCS], comments: 2 },
  12: { number: 12, title: "Email field clears after a failed sign-in", labels: [BUG], checklist: { done: 1, total: 2 }, comments: 4, assignee: "Bima Santoso" },
  19: { number: 19, title: "Move avatar uploads to the new bucket", labels: [IMPROVEMENT], assignee: "Dewi Lestari" },
  9: { number: 9, title: "Add a due date to recurring backups", labels: [FEATURE], checklist: { done: 2, total: 2 }, assignee: "Rani Aditya" },
};

const COLUMNS = [
  { id: "todo", name: "To Do" },
  { id: "doing", name: "In Progress" },
  { id: "done", name: "Done" },
] as const;

type ColumnId = (typeof COLUMNS)[number]["id"];

const START: Record<ColumnId, number[]> = { todo: [14, 17, 21], doing: [12, 19], done: [9] };

export default function BoardDemo() {
  const [columns, setColumns] = useState(START);
  const [announcement, setAnnouncement] = useState("");

  const onDragEnd = ({ source, destination, draggableId }: DropResult) => {
    if (!destination) return;
    const from = source.droppableId as ColumnId;
    const to = destination.droppableId as ColumnId;
    if (from === to && source.index === destination.index) return;

    setColumns((prev) => {
      const next = { ...prev, [from]: [...prev[from]] };
      if (to !== from) next[to] = [...prev[to]];
      const [moved] = next[from].splice(source.index, 1);
      next[to].splice(destination.index, 0, moved);
      return next;
    });
    if (from !== to) {
      setAnnouncement(`Issue #${draggableId} moved to ${COLUMNS.find((c) => c.id === to)?.name}.`);
    }
  };

  return (
    <div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid gap-3 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.id} className="flex flex-col rounded-lg bg-tk-subtle p-2 dark:bg-tk-dark-subtle">
              <div className="mb-2 px-1 text-sm font-semibold">
                {col.name} <span className="ml-1 font-normal text-tk-faint">{columns[col.id].length}</span>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[72px] flex-1 rounded-md transition-colors ${
                      snapshot.isDraggingOver ? "bg-tk-accent-soft/60 dark:bg-tk-accent/15" : ""
                    }`}
                  >
                    {columns[col.id].map((number, index) => (
                      <Draggable key={number} draggableId={String(number)} index={index}>
                        {(drag, dragSnap) => (
                          <IssueCard
                            issue={ISSUES[number]}
                            done={col.id === "done"}
                            dragging={dragSnap.isDragging}
                            innerRef={drag.innerRef}
                            {...drag.draggableProps}
                            {...drag.dragHandleProps}
                          />
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
      <p className="mt-3 text-sm text-tk-muted dark:text-tk-dark-muted">
        Drag a card to another column. With a keyboard: Tab to a card, Space to pick it up, arrow keys to move,
        Space to drop.
      </p>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

function IssueCard({
  issue,
  done,
  dragging,
  innerRef,
  ...rest
}: {
  issue: DemoIssue;
  done: boolean;
  dragging: boolean;
  innerRef: (el: HTMLElement | null) => void;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      ref={innerRef}
      {...rest}
      aria-label={`Issue #${issue.number}: ${issue.title}`}
      className={`mb-2 rounded-md border bg-tk-surface p-2.5 text-sm focus:outline-hidden focus-visible:ring-2 focus-visible:ring-tk-accent/50 dark:bg-tk-dark-surface ${
        dragging
          ? "border-tk-accent shadow-lg"
          : "border-tk-border hover:border-[#d4d4d8] dark:border-tk-dark-border dark:hover:border-[#3f3f46]"
      }`}
    >
      <div className="mb-1.5 flex flex-wrap gap-1">
        {issue.labels.map((l) => (
          <LabelChip key={l.name} name={l.name} color={l.color} size="sm" />
        ))}
      </div>
      <p className={`font-medium leading-snug ${done ? "text-tk-muted line-through decoration-tk-faint dark:text-tk-dark-muted" : ""}`}>
        {issue.title}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-tk-muted dark:text-tk-dark-muted">
          <span>#{issue.number}</span>
          {issue.due && !done && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-tk-orange-soft px-1.5 py-0.5 text-tk-orange dark:bg-tk-orange/25 dark:text-[#fcd34d]">
              <CalendarDays className="h-3 w-3" />
              {issue.due}
            </span>
          )}
          <ChecklistBadge checklist={issue.checklist ?? null} />
          {issue.comments ? (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {issue.comments}
            </span>
          ) : null}
        </div>
        {issue.assignee && <Avatar name={issue.assignee} size={22} />}
      </div>
    </div>
  );
}
