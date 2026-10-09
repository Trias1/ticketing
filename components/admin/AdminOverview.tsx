"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
  LogIn,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
  Wifi,
} from "lucide-react";
import {
  Avatar,
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  Skeleton,
  TeamBadge,
  TEAM_LABEL,
  TextLink,
  formatDate,
  timeAgo,
  type BadgeTone,
} from "components/ui/kit";
import {
  useAdminOverview,
  type AdminOverview as Overview,
  type OverviewUser,
  type SecurityFinding,
  type Severity,
} from "./useAdminOverview";

const USERS_HREF = "/dashboard/admin/management-user";

export default function AdminOverview() {
  const { data, error, isLoading, mutate, isValidating } = useAdminOverview();

  return (
    <div className="min-h-full bg-tk-bg px-4 py-6 text-tk-text dark:bg-tk-dark-bg dark:text-tk-dark-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-tk-divider pb-5 dark:border-tk-dark-divider sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Administration</h1>
            <p className="mt-1 text-sm text-tk-muted dark:text-tk-dark-muted">
              Manage team members and monitor account security.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => mutate()}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-tk-border bg-tk-surface px-3 text-sm font-medium hover:bg-tk-subtle dark:border-tk-dark-border dark:bg-tk-dark-surface dark:hover:bg-tk-dark-subtle"
            >
              <RefreshCw className={clsx("h-4 w-4", isValidating && "animate-spin")} />
              Refresh
            </button>
            <ButtonLink href={USERS_HREF} variant="default">
              <Users className="h-4 w-4" /> Manage users
            </ButtonLink>
            <ButtonLink href="/dashboard/admin/register-user">
              <UserPlus className="h-4 w-4" /> New user
            </ButtonLink>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-[#fecaca] bg-tk-red-soft px-4 py-3 text-sm text-tk-red dark:border-tk-red/40 dark:bg-tk-red/10 dark:text-[#fca5a5]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error.message}</span>
          </div>
        )}

        <StatRow data={data} loading={isLoading} />

        <div className="grid gap-6 lg:grid-cols-3">
          <SecurityPanel data={data} loading={isLoading} />
          <TeamMembers data={data} loading={isLoading} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <UserList
            title="Latest members"
            users={data?.latestUsers}
            loading={isLoading}
            meta={(u) => `Joined ${formatDate(u.createdAt)}`}
            action={<TextLink href={USERS_HREF}>View all</TextLink>}
            emptyIcon={UserPlus}
            emptyTitle="No members yet"
          />
          <UserList
            title="Recent sign-ins"
            users={data?.recentLogins}
            loading={isLoading}
            meta={(u) => (u.online ? "Online now" : timeAgo(u.lastLoginAt))}
            emptyIcon={LogIn}
            emptyTitle="No sign-in activity yet"
          />
          <UserList
            title={
              <span className="flex items-center gap-2">
                Admin accounts {data && <Badge>{data.counts.admins}</Badge>}
              </span>
            }
            users={data?.admins}
            loading={isLoading}
            meta={(u) => (u.online ? "Online now" : `Signed in ${timeAgo(u.lastLoginAt).toLowerCase()}`)}
            emptyIcon={ShieldCheck}
            emptyTitle="No admins yet"
          />
        </div>

        {data && (
          <p className="text-right text-xs text-tk-faint dark:text-tk-dark-faint">
            Updated {timeAgo(data.generatedAt).toLowerCase()} · auto-refreshes every 30 seconds
          </p>
        )}
      </div>
    </div>
  );
}

type SectionProps = { data?: Overview; loading: boolean };

function StatRow({ data, loading }: SectionProps) {
  const c = data?.counts;
  const attention = data?.findings.filter((f) => f.severity === "high" || f.severity === "medium").length ?? 0;

  const stats = [
    {
      label: "Total members",
      icon: Users,
      value: c?.users,
      hint: c ? `${c.active} active · ${c.blocked} deactivated` : "",
      href: USERS_HREF,
      link: "Manage users",
    },
    {
      label: "Online now",
      icon: Wifi,
      value: c?.online,
      hint: c ? `of ${c.active} active accounts` : "",
      href: USERS_HREF,
      link: "View status",
    },
    {
      label: "Admin",
      icon: ShieldCheck,
      value: c?.admins,
      hint: "Full access to the admin area",
      href: USERS_HREF,
      link: "Manage roles",
    },
    {
      label: "Needs attention",
      icon: ShieldAlert,
      value: attention,
      hint: c ? `${c.dormant} dormant · ${c.neverLoggedIn} never signed in` : "",
      href: "#security",
      link: "View findings",
      tone: attention > 0 ? "text-tk-orange dark:text-[#fcd34d]" : undefined,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="flex flex-col rounded-lg border border-tk-border bg-tk-surface p-4 transition-colors hover:border-[#d4d4d8] dark:border-tk-dark-border dark:bg-tk-dark-surface dark:hover:border-[#3f3f46]"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-tk-muted dark:text-tk-dark-muted">
              <Icon className="h-4 w-4" />
              {s.label}
            </div>
            {loading ? (
              <Skeleton className="mt-3 h-8 w-16" />
            ) : (
              <p className={clsx("mt-2 text-3xl font-semibold tabular-nums", s.tone)}>{s.value ?? 0}</p>
            )}
            <p className="mt-1 min-h-5 text-xs text-tk-faint dark:text-tk-dark-faint">{s.hint}</p>
            <div className="mt-3 border-t border-tk-divider pt-3 dark:border-tk-dark-divider">
              <TextLink href={s.href}>{s.link}</TextLink>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const SEVERITY: Record<Severity, { label: string; tone: BadgeTone; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  high: { label: "High", tone: "red", icon: ShieldAlert, color: "text-tk-red dark:text-[#fca5a5]" },
  medium: { label: "Medium", tone: "orange", icon: AlertTriangle, color: "text-tk-orange dark:text-[#fcd34d]" },
  low: { label: "Low", tone: "blue", icon: Info, color: "text-tk-accent dark:text-[#5eead4]" },
  info: { label: "Info", tone: "neutral", icon: Info, color: "text-tk-muted dark:text-tk-dark-muted" },
};

export function SecurityPanel({ data, loading }: SectionProps) {
  const findings = data?.findings ?? [];

  return (
    <div id="security" className="scroll-mt-20 lg:col-span-2">
      <Card
        className="h-full"
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-tk-muted dark:text-tk-dark-muted" />
            Account security
          </span>
        }
        action={<TextLink href={USERS_HREF}>Manage access</TextLink>}
      >
        {loading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : findings.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No findings" description="All accounts look healthy." />
        ) : (
          <ul className="divide-y divide-tk-divider dark:divide-tk-dark-divider">
            {findings.map((f) => (
              <FindingRow key={f.id} finding={f} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function FindingRow({ finding }: { finding: SecurityFinding }) {
  const [open, setOpen] = useState(finding.severity === "high");
  const sev = SEVERITY[finding.severity];
  const Icon = sev.icon;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-tk-subtle dark:hover:bg-tk-dark-subtle"
      >
        <Icon className={clsx("mt-0.5 h-4 w-4 shrink-0", sev.color)} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{finding.title}</span>
            <Badge tone={sev.tone}>{sev.label}</Badge>
            <Badge>{finding.users.length} {finding.users.length === 1 ? "account" : "accounts"}</Badge>
          </span>
          <span className="mt-0.5 block text-sm text-tk-muted dark:text-tk-dark-muted">{finding.description}</span>
        </span>
        <ChevronDown className={clsx("mt-0.5 h-4 w-4 shrink-0 text-tk-faint transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul className="mx-4 mb-3 overflow-hidden rounded-md border border-tk-divider dark:border-tk-dark-divider">
          {finding.users.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 border-b border-tk-divider px-3 py-2 last:border-b-0 dark:border-tk-dark-divider"
            >
              <Avatar name={u.name} src={u.avatarUrl} size={24} />
              <span className="min-w-0 flex-1 truncate text-sm">
                {u.name} <span className="text-tk-muted dark:text-tk-dark-muted">· {u.email}</span>
              </span>
              <span className="hidden text-xs text-tk-faint dark:text-tk-dark-faint sm:block">
                Last sign-in: {timeAgo(u.lastLoginAt).toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

const TEAM_BAR: Record<string, string> = {
  admin: "bg-tk-faint",
  cloud: "bg-tk-accent",
  devops: "bg-[#c17d10]",
  pm: "bg-tk-accent",
};

function TeamMembers({ data, loading }: SectionProps) {
  const teams = data?.teams ?? [];
  const max = Math.max(1, ...teams.map((t) => t.members));

  return (
    <Card title="Members by team" bodyClassName="p-4">
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : (
        <ul className="space-y-4">
          {teams.map((t) => (
            <li key={t.team}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium">
                  {TEAM_LABEL[t.team] ?? t.team}
                  {t.online > 0 && (
                    <span className="flex items-center gap-1 text-xs font-normal text-tk-green dark:text-[#86efac]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#2da160]" /> {t.online} online
                    </span>
                  )}
                </span>
                <span className="tabular-nums text-tk-muted dark:text-tk-dark-muted">{t.members} {t.members === 1 ? "member" : "members"}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-tk-divider dark:bg-tk-dark-subtle">
                <div
                  className={clsx("h-full rounded-full", TEAM_BAR[t.team] ?? "bg-tk-faint")}
                  style={{ width: `${(t.members / max) * 100}%` }}
                />
              </div>
              {t.active < t.members && (
                <p className="mt-1 text-xs text-tk-faint dark:text-tk-dark-faint">{t.members - t.active} deactivated</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function UserList({
  title,
  users,
  loading,
  meta,
  action,
  emptyIcon,
  emptyTitle,
}: {
  title: React.ReactNode;
  users?: OverviewUser[];
  loading: boolean;
  meta: (u: OverviewUser) => string;
  action?: React.ReactNode;
  emptyIcon: React.ComponentType<{ className?: string }>;
  emptyTitle: string;
}) {
  return (
    <Card title={title} action={action}>
      {loading ? (
        <div className="space-y-4 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : !users || users.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} />
      ) : (
        <ul className="divide-y divide-tk-divider dark:divide-tk-dark-divider">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={u.name} src={u.avatarUrl} online={u.online} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{u.name}</span>
                  {!u.isActive && <Badge tone="red">Deactivated</Badge>}
                </span>
                <span className="block truncate text-xs text-tk-muted dark:text-tk-dark-muted">{u.email}</span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <TeamBadge team={u.team} />
                <span className="whitespace-nowrap text-xs text-tk-faint dark:text-tk-dark-faint">{meta(u)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
