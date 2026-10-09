"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import { MessageSquare, Plus } from "lucide-react";
import { Avatar, LabelChip } from "components/ui/kit";
import { projectBase, sendJson, type ProjectDetail } from "../hooks";
import { ChecklistBadge, DueBadge, type IssueListItem } from "../issue-ui";
import { invalidateIssueLists } from "./IssueDetail";

// Board: kolom = status project. Kartu bisa digeser antar kolom.
export default function IssueBoard({
  projectId,
  project,
  issues,
  onOpen,
}: {
  projectId: string;
  project: ProjectDetail;
  issues: IssueListItem[];
  onOpen: (issue: IssueListItem) => void;
}) {
  const [local, setLocal] = useState(issues);
  useEffect(() => setLocal(issues), [issues]);

  const columns = useMemo(
    () =>
      [...project.statuses]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((s) => ({ ...s, issues: local.filter((i) => i.statusId === s.id) })),
    [project.statuses, local]
  );

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const issue = local.find((i) => i.id === draggableId);
    if (!issue) return;

    const previous = local;
    setLocal((list) => list.map((i) => (i.id === issue.id ? { ...i, statusId: destination.droppableId } : i)));
    try {
      await sendJson(`/api/projects/${projectId}/issues/${issue.number}`, "PATCH", { statusId: destination.droppableId });
      await invalidateIssueLists(projectId);
      globalMutate(`/api/projects/${projectId}/issues/${issue.number}`);
    } catch (e) {
      setLocal(previous);
      toast.error(e instanceof Error ? e.message : "Couldn't move issue");
    }
  };

  const base = projectBase(project.project);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div key={col.id} className="flex w-72 shrink-0 flex-col rounded-lg bg-tk-subtle p-2 dark:bg-tk-dark-subtle">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-semibold">
                {col.name} <span className="ml-1 font-normal text-tk-faint">{col.issues.length}</span>
              </span>
            </div>
            <Droppable droppableId={col.id}>
              {(provided, snapshot) => (
                // Jarak antar kartu memakai margin di kartu itu sendiri; space-y Tailwind v4 (margin-bottom
                // di elemen induk) membuat drag-and-drop salah menghitung posisi.
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[60px] flex-1 rounded-md transition-colors ${snapshot.isDraggingOver ? "bg-tk-accent-soft/60 dark:bg-tk-accent/15" : ""}`}
                >
                  {col.issues.map((issue, index) => (
                    <Draggable key={issue.id} draggableId={issue.id} index={index}>
                      {(drag, dragSnap) => (
                        <div
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          {...drag.dragHandleProps}
                          onClick={() => onOpen(issue)}
                          className={`mb-2 cursor-pointer rounded-md border bg-tk-surface p-2.5 text-sm dark:bg-tk-dark-surface ${
                            dragSnap.isDragging
                              ? "border-tk-accent shadow-lg"
                              : "border-tk-border hover:border-[#d4d4d8] dark:border-tk-dark-border dark:hover:border-[#3f3f46]"
                          }`}
                        >
                          {issue.labelDetails.length > 0 && (
                            <div className="mb-1.5 flex flex-wrap gap-1">
                              {issue.labelDetails.map((l) => (
                                <LabelChip key={l.id} name={l.name} color={l.color} size="sm" />
                              ))}
                            </div>
                          )}
                          <p className="font-medium leading-snug">{issue.title}</p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-tk-muted dark:text-tk-dark-muted">
                              <span>#{issue.number}</span>
                              <DueBadge dueDate={issue.dueDate} closed={false} />
                              <ChecklistBadge checklist={issue.checklist} />
                              {issue.commentCount > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  {issue.commentCount}
                                </span>
                              )}
                            </div>
                            {issue.assignee && <Avatar name={issue.assignee.name} src={issue.assignee.avatarUrl} size={22} />}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
            <Link
              href={`${base}/issues/new?status=${col.id}`}
              className="mt-2 flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-tk-muted hover:bg-black/5 hover:text-tk-text dark:text-tk-dark-muted dark:hover:bg-white/5"
            >
              <Plus className="h-4 w-4" /> Add issue
            </Link>
          </div>
        ))}
      </div>
      <p className="text-xs text-tk-faint">Closed issues are hidden from the board. See them in the List view under Closed.</p>
    </DragDropContext>
  );
}
