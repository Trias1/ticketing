"use client";

import useSWR from "swr";
import { Badge, type BadgeTone } from "components/ui/kit";

// Nama tim diambil dari /api/teams (tabel teams) dan di-cache SWR, jadi semua komponen berbagi
// satu request. Selama belum termuat, slug dirapikan sebagai cadangan.

export type Team = { slug: string; name: string };

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load teams");
  return res.json();
};

export function useTeams() {
  return useSWR<Team[]>("/api/teams", fetcher, { revalidateOnFocus: false, dedupingInterval: 60_000 });
}

const prettySlug = (slug: string) => slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function useTeamName() {
  const { data } = useTeams();
  return (slug: string | null | undefined) => {
    if (!slug) return "";
    if (slug === "superadmin") return "Superadmin";
    return data?.find((t) => t.slug === slug)?.name ?? prettySlug(slug);
  };
}

export function TeamName({ team }: { team: string | null | undefined }) {
  return <>{useTeamName()(team)}</>;
}

// Warna badge tetap per tim: dari slug, supaya tim baru otomatis dapat warna yang konsisten.
const TONES: BadgeTone[] = ["blue", "orange", "violet", "green", "accent"];
const FIXED_TONE: Record<string, BadgeTone> = { cloud: "blue", devops: "orange", pm: "violet", superadmin: "neutral" };

export function teamTone(slug: string): BadgeTone {
  if (FIXED_TONE[slug]) return FIXED_TONE[slug];
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

export function TeamBadge({ team }: { team: string }) {
  return <Badge tone={teamTone(team)}>{useTeamName()(team)}</Badge>;
}
