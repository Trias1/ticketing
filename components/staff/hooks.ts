"use client";

import useSWR from "swr";
import { usePathname } from "next/navigation";

export type MyProject = {
  id: string;
  name: string;
  slug: string;
  team: string;
  description: string | null;
  color: string;
  icon: string | null;
  updatedAt: string;
  role: "owner" | "member";
  starred: boolean;
  openIssues: number;
  memberCount: number;
};

export type ProjectLabel = { id: string; name: string; color: string; description: string | null };
export type ProjectStatus = { id: string; name: string; order: number | null };
export type ProjectMember = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  team: string;
  role: "owner" | "member";
};

export type ProjectDetail = {
  project: { id: string; name: string; slug: string; team: string; description: string | null; color: string; icon: string | null };
  role: "owner" | "member";
  starred: boolean;
  statuses: ProjectStatus[];
  labels: ProjectLabel[];
  members: ProjectMember[];
};

export const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? "Failed to load data");
  return res.json();
};

export async function sendJson(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
}

export function useMyProjects() {
  return useSWR<MyProject[]>("/api/me/projects", fetcher);
}

export function useProject(projectId: string | null | undefined) {
  return useSWR<ProjectDetail>(projectId ? `/api/projects/${projectId}` : null, fetcher);
}

// Project yang sedang dibuka, dibaca dari URL /dashboard/{team}/project/{slug}/...
export function useCurrentProject() {
  const pathname = usePathname();
  const match = pathname.match(/^\/dashboard\/([^/]+)\/project\/([^/]+)/);
  const { data: projects } = useMyProjects();
  if (!match || match[2] === "new") return { team: null, slug: null, project: null };
  const [, team, slug] = match;
  return { team, slug, project: projects?.find((p) => p.team === team && p.slug === slug) ?? null };
}

export const projectBase = (p: { team: string; slug: string }) => `/dashboard/${p.team}/project/${p.slug}`;

const LAST_PROJECT_KEY = "tk:lastProject";

export function rememberProject(id: string) {
  try {
    localStorage.setItem(LAST_PROJECT_KEY, id);
  } catch {}
}

export function lastProjectId() {
  try {
    return localStorage.getItem(LAST_PROJECT_KEY);
  } catch {
    return null;
  }
}
