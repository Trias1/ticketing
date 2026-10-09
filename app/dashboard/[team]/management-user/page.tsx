"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import clsx from "clsx";
import { toast } from "sonner";
import { Check, Copy, KeyRound, Search, UserPlus, Users } from "lucide-react";
import PasswordStrength from "components/ui/PasswordStrength";
import { checkPassword } from "lib/password-policy";
import {
  Avatar,
  Badge,
  ButtonLink,
  Card,
  ConfirmDialog,
  EmptyState,
  Skeleton,
  TEAM_LABEL,
  formatDate,
  timeAgo,
} from "components/ui/kit";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string;
  access?: string[] | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  avatarUrl?: string | null;
};

const ROLES = ["admin", "staff"];
const TEAMS_BY_ROLE: Record<string, string[]> = {
  admin: ["admin"],
  staff: ["cloud", "devops", "pm"],
};
const ONLINE_WINDOW_MS = 60 * 1000;

const TABS = [
  { key: "all", label: "All", match: (_: User) => true },
  { key: "admins", label: "Admins", match: (u: User) => u.role === "admin" },
  { key: "active", label: "Active", match: (u: User) => u.isActive },
  { key: "blocked", label: "Deactivated", match: (u: User) => !u.isActive },
] as const;

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? "Failed to load users");
  return res.json();
};

const selectClass =
  "h-8 w-full rounded-md border border-tk-border bg-tk-surface px-2 text-sm text-tk-text focus:border-tk-accent focus:outline-hidden focus:ring-2 focus:ring-tk-accent/20 disabled:opacity-60 dark:border-tk-dark-border dark:bg-tk-dark-surface dark:text-tk-dark-text";

export default function ManagementUserPage() {
  const { data: users, error, isLoading, mutate } = useSWR<User[]>("/api/admin/users", fetcher);
  const { data: me } = useSWR<{ user: { id: string } }>("/api/jwt", fetcher);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState<{ name: string; password: string } | null>(null);

  const list = useMemo(() => users ?? [], [users]);
  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.key, list.filter(t.match).length])),
    [list]
  );
  const activeTab = TABS.find((t) => t.key === tab)!;
  const q = search.toLowerCase();
  const filtered = list.filter(
    (u) => activeTab.match(u) && (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  );

  const patchLocal = (id: string, patch: Partial<User>) =>
    mutate((prev) => prev?.map((u) => (u.id === id ? { ...u, ...patch } : u)), { revalidate: false });

  const request = async (id: string, url: string, init: RequestInit, onOk: () => void, okMsg: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        onOk();
        toast.success(okMsg);
        const body = await res.json().catch(() => null);
        if (body?.warning) toast.warning(body.warning, { duration: 10000 });
      } else {
        const body = await res.json().catch(() => null);
        toast.error(body?.message ?? "Failed to save changes");
      }
    } catch {
      toast.error("Network error, please try again");
    } finally {
      setLoadingId(null);
    }
  };

  const updateRole = (u: User, role: string, team: string) =>
    request(
      u.id,
      `/api/admin/users/${u.id}/role`,
      { method: "PATCH", body: JSON.stringify({ role, team }) },
      () => patchLocal(u.id, { role, team }),
      `Updated role for ${u.name}`
    );


  const resetPassword = async (u: User, password: string) => {
    setLoadingId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.message ?? "Failed to reset password");
        return;
      }
      setTempPassword({ name: u.name, password: body.password });
    } catch {
      toast.error("Network error, please try again");
    } finally {
      setLoadingId(null);
      setResetUser(null);
    }
  };

  const toggleStatus = (u: User) =>
    request(
      u.id,
      "/api/admin/users",
      { method: "POST", body: JSON.stringify({ id: u.id, isActive: !u.isActive }) },
      () => patchLocal(u.id, { isActive: !u.isActive }),
      `${u.name} ${u.isActive ? "deactivated" : "activated"}`
    );

  return (
    <div className="min-h-full bg-tk-bg px-4 py-6 text-tk-text dark:bg-tk-dark-bg dark:text-tk-dark-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-4 border-b border-tk-divider pb-5 dark:border-tk-dark-divider sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
            <p className="mt-1 text-sm text-tk-muted dark:text-tk-dark-muted">
              Manage roles, teams, and account status. Project access is managed by project owners.
            </p>
          </div>
          <ButtonLink href="/dashboard/admin/register-user">
            <UserPlus className="h-4 w-4" /> New user
          </ButtonLink>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-tk-divider dark:border-tk-dark-divider">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={clsx(
                  "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm",
                  tab === t.key
                    ? "border-tk-accent font-semibold dark:border-[#5eead4]"
                    : "border-transparent text-tk-muted hover:border-tk-border hover:text-tk-text dark:text-tk-dark-muted dark:hover:text-tk-dark-text"
                )}
              >
                {t.label}
                <span className="rounded-full bg-tk-subtle px-1.5 text-xs tabular-nums text-tk-muted dark:bg-tk-dark-subtle dark:text-tk-dark-muted">
                  {counts[t.key] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <label className="flex h-8 items-center gap-2 rounded-md border border-tk-border bg-tk-surface px-2.5 text-sm focus-within:border-tk-accent focus-within:ring-2 focus-within:ring-tk-accent/20 dark:border-tk-dark-border dark:bg-tk-dark-surface sm:w-72">
            <Search className="h-4 w-4 text-tk-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="w-full bg-transparent outline-hidden placeholder:text-tk-faint"
            />
          </label>
        </div>

        <Card>
          {error ? (
            <p className="p-4 text-sm text-tk-red dark:text-[#fca5a5]">{error.message}</p>
          ) : isLoading ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title="No matching users" description="Try another tab or search term." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-tk-divider text-left text-xs font-semibold text-tk-muted dark:border-tk-dark-divider dark:text-tk-dark-muted">
                    <th className="px-4 py-2.5">Name</th>
                    <th className="w-32 px-4 py-2.5">Role</th>
                    <th className="w-44 px-4 py-2.5">Team</th>
                    <th className="px-4 py-2.5">Last activity</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tk-divider dark:divide-tk-dark-divider">
                  {filtered.map((u) => {
                    const busy = loadingId === u.id;
                    const isMe = me?.user.id === u.id;
                    const online =
                      !!u.lastLoginAt && Date.now() - new Date(u.lastLoginAt).getTime() < ONLINE_WINDOW_MS;

                    return (
                      <tr key={u.id} className={clsx("align-top", !u.isActive && "bg-tk-subtle/60 dark:bg-tk-dark-subtle/40")}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={u.name} src={u.avatarUrl} online={online} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium">{u.name}</span>
                                {isMe && <Badge tone="accent">You</Badge>}
                                {u.role === "admin" && <Badge>Admin</Badge>}
                              </div>
                              <div className="truncate text-xs text-tk-muted dark:text-tk-dark-muted">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <select
                            aria-label={`Role ${u.name}`}
                            disabled={busy || isMe}
                            title={isMe ? "You can't change your own role" : undefined}
                            value={u.role}
                            onChange={(e) => updateRole(u, e.target.value, TEAMS_BY_ROLE[e.target.value][0])}
                            className={selectClass}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r === "admin" ? "Admin" : "Staff"}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-4 py-3">
                          <select
                            aria-label={`Team ${u.name}`}
                            disabled={busy || u.role === "admin"}
                            value={u.team}
                            onChange={(e) => updateRole(u, u.role, e.target.value)}
                            className={selectClass}
                          >
                            {TEAMS_BY_ROLE[u.role]?.map((t) => (
                              <option key={t} value={t}>
                                {TEAM_LABEL[t] ?? t}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-4 py-3">
                          <div className={clsx(online ? "text-tk-green dark:text-[#86efac]" : "text-tk-text dark:text-tk-dark-text")}>
                            {online ? "Online" : timeAgo(u.lastLoginAt)}
                          </div>
                          {u.lastLoginAt && !online && (
                            <div className="text-xs text-tk-faint dark:text-tk-dark-faint">{formatDate(u.lastLoginAt)}</div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {u.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Deactivated</Badge>}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={busy || isMe}
                            title={isMe ? "Use Edit profile to change your own password" : "Reset password"}
                            aria-label={`Reset password for ${u.name}`}
                            onClick={() => setResetUser(u)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-tk-border px-3 text-sm font-medium text-tk-text transition-colors hover:bg-tk-subtle disabled:cursor-not-allowed disabled:opacity-50 dark:border-tk-dark-border dark:text-tk-dark-text dark:hover:bg-tk-dark-subtle"
                          >
                            <KeyRound className="h-4 w-4" />
                            <span className="hidden xl:inline">Reset password</span>
                          </button>
                          <button
                            type="button"
                            disabled={busy || isMe}
                            title={isMe ? "You can't deactivate your own account" : undefined}
                            onClick={() => (u.isActive ? setConfirmUser(u) : toggleStatus(u))}
                            className={clsx(
                              "inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                              u.isActive
                                ? "border-tk-border text-tk-red hover:border-[#fecaca] hover:bg-tk-red-soft dark:border-tk-dark-border dark:text-[#fca5a5] dark:hover:bg-tk-red/10"
                                : "border-tk-border text-tk-green hover:bg-tk-green-soft dark:border-tk-dark-border dark:text-[#86efac] dark:hover:bg-tk-green/10"
                            )}
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {resetUser && (
        <ResetPasswordDialog
          name={resetUser.name}
          email={resetUser.email}
          busy={loadingId === resetUser.id}
          onCancel={() => setResetUser(null)}
          onConfirm={(password) => resetPassword(resetUser, password)}
        />
      )}

      {tempPassword && (
        <TempPasswordDialog
          name={tempPassword.name}
          password={tempPassword.password}
          onClose={() => setTempPassword(null)}
        />
      )}

      <ConfirmDialog
        open={!!confirmUser}
        title={`Deactivate ${confirmUser?.name ?? ""}?`}
        description="This user will lose access to the app immediately. You can activate them again at any time."
        confirmLabel="Deactivate"
        danger
        busy={!!confirmUser && loadingId === confirmUser.id}
        onCancel={() => setConfirmUser(null)}
        onConfirm={async () => {
          if (!confirmUser) return;
          await toggleStatus(confirmUser);
          setConfirmUser(null);
        }}
      />
    </div>
  );
}

// Menampilkan password sementara sekali saja; setelah ditutup tidak bisa dilihat lagi.
function TempPasswordDialog({ name, password, onClose }: { name: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the password and copy it manually.");
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="temp-password-title"
        className="w-full max-w-md rounded-lg border border-tk-border bg-tk-surface shadow-xl dark:border-tk-dark-border dark:bg-tk-dark-surface"
      >
        <div className="border-b border-tk-divider px-5 py-4 dark:border-tk-dark-divider">
          <h2 id="temp-password-title" className="text-base font-semibold">
            Temporary password for {name}
          </h2>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm text-tk-muted dark:text-tk-dark-muted">
          <p>
            Share this password with {name} through a private channel. It won&apos;t be shown again, and they must replace it
            when they sign in.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 select-all rounded-md border border-tk-border bg-tk-subtle px-3 py-2 font-mono text-sm text-tk-text dark:border-tk-dark-border dark:bg-tk-dark-subtle dark:text-tk-dark-text">
              {password}
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-tk-border px-3 text-sm font-medium text-tk-text hover:bg-tk-subtle dark:border-tk-dark-border dark:text-tk-dark-text dark:hover:bg-tk-dark-subtle"
            >
              {copied ? <Check className="h-4 w-4 text-tk-green" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p>Ask them to change it from Edit profile after signing in.</p>
        </div>
        <div className="flex justify-end border-t border-tk-divider px-5 py-3 dark:border-tk-dark-divider">
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="inline-flex h-8 items-center rounded-md bg-tk-accent px-3 text-sm font-medium text-white hover:bg-tk-accent-hover"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// Dialog reset: admin boleh mengetik password sementara sendiri, atau dikosongkan agar dibuatkan otomatis.
function ResetPasswordDialog({
  name,
  email,
  busy,
  onCancel,
  onConfirm,
}: {
  name: string;
  email: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const custom = password.trim();
  // Kosong = server membuat password acak; kalau diisi harus lolos aturan password.
  const invalid = custom.length > 0 && !checkPassword(custom, { email, name }).ok;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invalid) onConfirm(custom);
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}
    >
      <form
        onSubmit={submit}
        onKeyDown={(e) => e.key === "Escape" && !busy && onCancel()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-password-title"
        className="w-full max-w-md rounded-lg border border-tk-border bg-tk-surface shadow-xl dark:border-tk-dark-border dark:bg-tk-dark-surface"
      >
        <div className="border-b border-tk-divider px-5 py-4 dark:border-tk-dark-divider">
          <h2 id="reset-password-title" className="text-base font-semibold">
            Reset password for {name}?
          </h2>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm">
          <p className="text-tk-muted dark:text-tk-dark-muted">
            Their current password and all their sessions stop working immediately. They must set their own password the
            next time they sign in.
          </p>
          <div>
            <label htmlFor="temp-password" className="mb-1 block font-semibold">
              Temporary password <span className="font-normal text-tk-muted dark:text-tk-dark-muted">(optional)</span>
            </label>
            <input
              id="temp-password"
              type="text"
              autoComplete="off"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty to generate one"
              className="h-9 w-full rounded-md border border-tk-border bg-tk-surface px-3 font-mono text-sm placeholder:font-sans placeholder:text-tk-faint focus:border-tk-accent focus:outline-hidden focus:ring-2 focus:ring-tk-accent/20 dark:border-tk-dark-border dark:bg-tk-dark-surface"
            />
            {custom ? (
              <PasswordStrength password={custom} context={{ email, name }} />
            ) : (
              <p className="mt-1 text-xs text-tk-muted dark:text-tk-dark-muted">
                Leave empty to generate one like k7mp-x3qa-9tfe.
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-tk-divider px-5 py-3 dark:border-tk-dark-divider">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-8 items-center rounded-md border border-tk-border px-3 text-sm font-medium hover:bg-tk-subtle disabled:opacity-60 dark:border-tk-dark-border dark:hover:bg-tk-dark-subtle"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || invalid}
            className="inline-flex h-8 items-center rounded-md bg-tk-accent px-3 text-sm font-medium text-white hover:bg-tk-accent-hover disabled:opacity-60"
          >
            {busy ? "Resetting..." : "Reset password"}
          </button>
        </div>
      </form>
    </div>
  );
}
