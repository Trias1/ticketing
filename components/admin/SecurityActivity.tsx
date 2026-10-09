"use client";

import { useState } from "react";
import useSWR from "swr";
import clsx from "clsx";
import { Activity } from "lucide-react";
import { Badge, Card, EmptyState, Skeleton, timeAgo } from "components/ui/kit";

type SecurityEvent = {
  id: string;
  type: string;
  email: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  actorName: string | null;
};

type Response = {
  summary: { failed: number; blocked: number; signins: number; ips: number; reuse: number };
  events: SecurityEvent[];
};

type Tone = Parameters<typeof Badge>[0]["tone"];

const EVENT_LABELS: Record<string, { label: string; tone: Tone }> = {
  login_success: { label: "Signed in", tone: "green" },
  logout: { label: "Signed out", tone: "neutral" },
  login_failed: { label: "Failed sign-in", tone: "orange" },
  login_blocked: { label: "Blocked (too many attempts)", tone: "red" },
  login_disabled: { label: "Deactivated account tried", tone: "orange" },
  token_reuse: { label: "Stolen session blocked", tone: "red" },
  password_changed: { label: "Password changed", tone: "blue" },
  password_reset: { label: "Password reset by admin", tone: "violet" },
  email_changed: { label: "Email changed", tone: "blue" },
  user_deactivated: { label: "Account deactivated", tone: "violet" },
  role_changed: { label: "Role changed", tone: "violet" },
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "attention", label: "Needs attention" },
  { id: "signins", label: "Sign-ins" },
  { id: "account", label: "Account changes" },
] as const;

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load security activity");
  return res.json();
};

// Ringkas user agent jadi "Chrome · Windows" supaya mudah dibaca.
function device(ua: string | null) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : /node|curl|python|axios|undici/i.test(ua)
              ? "Script / API client"
              : "Other";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} · ${os}` : browser;
}

function Stat({ label, value, alert }: { label: string; value?: number; alert?: boolean }) {
  return (
    <div className="rounded-md border border-tk-border px-3 py-2 dark:border-tk-dark-border">
      <div className="text-xs text-tk-muted dark:text-tk-dark-muted">{label}</div>
      <div
        className={clsx(
          "text-lg font-semibold tabular-nums",
          alert && value ? "text-tk-red dark:text-[#fca5a5]" : "text-tk-text dark:text-tk-dark-text"
        )}
      >
        {value ?? "–"}
      </div>
    </div>
  );
}

// Log keamanan untuk admin: siapa masuk, dari IP mana, dan percobaan yang ditolak.
export default function SecurityActivity() {
  const [group, setGroup] = useState<(typeof FILTERS)[number]["id"]>("all");
  const { data, isLoading } = useSWR<Response>(`/api/admin/security-events?group=${group}`, fetcher, {
    refreshInterval: 30_000,
    keepPreviousData: true,
  });
  const s = data?.summary;

  return (
    <Card title="Sign-in activity" bodyClassName="p-0">
      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-5">
        <Stat label="Sign-ins (24h)" value={s?.signins} />
        <Stat label="Failed (24h)" value={s?.failed} alert />
        <Stat label="Blocked (24h)" value={s?.blocked} alert />
        <Stat label="IP addresses (24h)" value={s?.ips} />
        <Stat label="Stolen sessions (7d)" value={s?.reuse} alert />
      </div>

      <div className="flex gap-1 overflow-x-auto border-y border-tk-divider px-4 py-2 dark:border-tk-dark-divider">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setGroup(f.id)}
            className={clsx(
              "whitespace-nowrap rounded-md px-2.5 py-1 text-sm",
              group === f.id
                ? "bg-tk-subtle font-medium text-tk-text dark:bg-tk-dark-subtle dark:text-tk-dark-text"
                : "text-tk-muted hover:text-tk-text dark:text-tk-dark-muted dark:hover:text-tk-dark-text"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && !data ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !data?.events.length ? (
        <EmptyState icon={Activity} title="No activity yet" description="Sign-ins and security events will show up here." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs text-tk-muted dark:text-tk-dark-muted">
                <th className="px-4 py-2 font-medium">Event</th>
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-4 py-2 font-medium">IP address</th>
                <th className="px-4 py-2 font-medium">Device</th>
                <th className="px-4 py-2 text-right font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tk-divider dark:divide-tk-dark-divider">
              {data.events.map((e) => {
                const meta = EVENT_LABELS[e.type] ?? { label: e.type, tone: "neutral" as Tone };
                return (
                  <tr key={e.id}>
                    <td className="px-4 py-2.5">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {e.actorName && (
                        <div className="mt-0.5 text-xs text-tk-muted dark:text-tk-dark-muted">by {e.actorName}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{e.userName ?? "Unknown account"}</div>
                      <div className="text-xs text-tk-muted dark:text-tk-dark-muted">{e.userEmail ?? e.email ?? "–"}</div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{e.ip ?? "–"}</td>
                    <td className="px-4 py-2.5 text-xs text-tk-muted dark:text-tk-dark-muted">{device(e.userAgent)}</td>
                    <td
                      className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-tk-muted dark:text-tk-dark-muted"
                      title={new Date(e.createdAt).toLocaleString("en-US")}
                    >
                      {timeAgo(e.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
