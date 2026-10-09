import { and, asc, eq, sql } from "drizzle-orm";
import { randomInt } from "crypto";
import slugify from "slugify";
import { db } from "db";
import { activity, projects, ticketStatuses, tickets } from "db/schema";
import { isIssueNumber } from "lib/membership";

export const DEFAULT_STATUSES = ["To Do", "In Progress", "Done"];

export const DEFAULT_LABELS = [
  { name: "Bug", color: "#DC2626" },
  { name: "Feature", color: "#2563EB" },
  { name: "Improvement", color: "#7C3AED" },
  { name: "Documentation", color: "#0891B2" },
  { name: "Question", color: "#D97706" },
];

export const LABEL_COLORS = [
  "#DC2626", "#EA580C", "#CA8A04", "#16A34A", "#0F766E", "#0891B2",
  "#2563EB", "#4F46E5", "#7C3AED", "#DB2777", "#52525B", "#A16207",
];

export type ActivityType =
  | "created"
  | "closed"
  | "reopened"
  | "status"
  | "assignee"
  | "labels"
  | "title"
  | "due_date"
  | "description";

export async function logActivity(entry: {
  projectId: string;
  ticketId?: string | null;
  actorId: string;
  type: ActivityType;
  data?: Record<string, unknown>;
}) {
  await db.insert(activity).values({
    projectId: entry.projectId,
    ticketId: entry.ticketId ?? null,
    actorId: entry.actorId,
    type: entry.type,
    data: entry.data ?? null,
  });
}

// Ambil nomor issue berikutnya secara atomik (satu statement UPDATE ... RETURNING).
export async function allocateIssueNumber(projectId: string) {
  const [row] = await db
    .update(projects)
    .set({ issueCounter: sql`${projects.issueCounter} + 1` })
    .where(eq(projects.id, projectId))
    .returning({ number: projects.issueCounter });
  return row.number;
}

export function issueSlug(number: number, title: string) {
  const base = slugify(title, { lower: true, strict: true }).slice(0, 80) || "issue";
  return `${number}-${base}`;
}

const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function referenceCode() {
  return Array.from({ length: 10 }, () => REF_CHARS[randomInt(REF_CHARS.length)]).join("");
}

// Pastikan project punya kolom board; buat default kalau belum ada.
export async function ensureStatuses(projectId: string) {
  const existing = await db
    .select({ id: ticketStatuses.id, name: ticketStatuses.name, order: ticketStatuses.order })
    .from(ticketStatuses)
    .where(eq(ticketStatuses.projectId, projectId))
    .orderBy(asc(ticketStatuses.order), asc(ticketStatuses.name));
  if (existing.length > 0) return existing;

  return db
    .insert(ticketStatuses)
    .values(DEFAULT_STATUSES.map((name, order) => ({ projectId, name, order })))
    .returning({ id: ticketStatuses.id, name: ticketStatuses.name, order: ticketStatuses.order });
}

// Checklist = task list Markdown di deskripsi: "- [ ] item" / "- [x] item".
const TASK_RE = /^[ \t]*[-*][ \t]+\[( |x|X)\][ \t]+/gm;
export function checklistProgress(description: string | null | undefined) {
  if (!description) return null;
  const matches = Array.from(description.matchAll(TASK_RE));
  if (matches.length === 0) return null;
  const done = matches.filter((m) => m[1].toLowerCase() === "x").length;
  return { done, total: matches.length };
}

// Centang/hapus centang item checklist ke-index (urutan kemunculan) di deskripsi.
export function toggleChecklistItem(description: string, index: number, checked: boolean) {
  let i = -1;
  return description.replace(TASK_RE, (match) => {
    i += 1;
    if (i !== index) return match;
    return match.replace(/\[( |x|X)\]/, checked ? "[x]" : "[ ]");
  });
}

export function sameIds(a: string[], b: string[]) {
  return a.length === b.length && a.every((x) => b.includes(x));
}

export async function findIssue(projectId: string, number: number) {
  if (!isIssueNumber(number)) return undefined;
  return db.query.tickets.findFirst({
    where: and(eq(tickets.projectId, projectId), eq(tickets.number, number)),
  });
}

// Batas panjang deskripsi issue (markdown), supaya isi raksasa tidak membebani daftar & tampilan.
export const MAX_DESCRIPTION = 50_000;
