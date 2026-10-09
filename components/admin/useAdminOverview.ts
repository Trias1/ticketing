"use client";

import useSWR from "swr";

export type OverviewUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string;
  access: string[] | null;
  isActive: boolean;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
  online: boolean;
};

export type Severity = "high" | "medium" | "low" | "info";

export type SecurityFinding = {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  users: OverviewUser[];
};

export type AdminOverview = {
  generatedAt: string;
  counts: {
    users: number;
    active: number;
    blocked: number;
    admins: number;
    online: number;
    neverLoggedIn: number;
    dormant: number;
  };
  teams: { team: string; members: number; active: number; online: number }[];
  findings: SecurityFinding[];
  latestUsers: OverviewUser[];
  recentLogins: OverviewUser[];
  admins: OverviewUser[];
  blocked: OverviewUser[];
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? "Failed to load data");
  return res.json();
};

// Refresh tiap 30 detik (sama dengan interval heartbeat), cukup untuk status online.
export function useAdminOverview() {
  return useSWR<AdminOverview>("/api/admin/overview", fetcher, { refreshInterval: 30_000 });
}
