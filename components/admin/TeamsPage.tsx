"use client";

import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import { Check, Pencil, Trash2, UsersRound, X } from "lucide-react";
import { ButtonLink, Card, ConfirmDialog, EmptyState, Skeleton } from "components/ui/kit";
import { teamTone } from "components/ui/team";

type TeamRow = { slug: string; name: string; members: number; active: number; admins: number };

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? "Failed to load teams");
  return res.json();
};

const inputClass =
  "h-8 w-full rounded-md border border-tk-border bg-tk-surface px-2 text-sm text-tk-text focus:border-tk-accent focus:outline-hidden focus:ring-2 focus:ring-tk-accent/20 dark:border-tk-dark-border dark:bg-tk-dark-surface dark:text-tk-dark-text";
const iconButton =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-tk-border text-tk-muted hover:bg-tk-subtle hover:text-tk-text disabled:cursor-not-allowed disabled:opacity-50 dark:border-tk-dark-border dark:text-tk-dark-muted dark:hover:bg-tk-dark-subtle dark:hover:text-tk-dark-text";

const dot: Record<string, string> = {
  blue: "bg-tk-blue",
  orange: "bg-[#c17d10]",
  violet: "bg-tk-violet",
  green: "bg-tk-green",
  accent: "bg-tk-accent",
  neutral: "bg-tk-faint",
};

// Tim kerja untuk superadmin: daftar, ganti nama, hapus tim kosong. Tim baru dibuat bersama admin-nya.
export default function TeamsPage() {
  const { data: teams, error, isLoading, mutate } = useSWR<TeamRow[]>("/api/teams", fetcher);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TeamRow | null>(null);

  const send = async (slug: string, init: RequestInit, ok: string) => {
    setBusy(slug);
    try {
      const res = await fetch(`/api/teams/${slug}`, { ...init, headers: { "Content-Type": "application/json" } });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.message ?? "Failed to save changes");
        return false;
      }
      toast.success(ok);
      await mutate();
      // Nama tim juga dipakai di badge & menu di seluruh aplikasi.
      globalMutate("/api/teams");
      return true;
    } catch {
      toast.error("Network error, please try again");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const rename = async (t: TeamRow) => {
    const name = draft.trim();
    if (!name || name === t.name) return setEditing(null);
    if (await send(t.slug, { method: "PATCH", body: JSON.stringify({ name }) }, `Renamed to ${name}`)) setEditing(null);
  };

  return (
    <div className="min-h-full bg-tk-bg px-4 py-6 text-tk-text dark:bg-tk-dark-bg dark:text-tk-dark-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-col gap-4 border-b border-tk-divider pb-5 dark:border-tk-dark-divider sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
            <p className="mt-1 text-sm text-tk-muted dark:text-tk-dark-muted">
              Each team has one admin. Create a team together with its admin, or give a team without an admin a new one. Renaming a team keeps its accounts, projects and links.
            </p>
          </div>
          <ButtonLink href="/dashboard/superadmin/register-user">
            <UsersRound className="h-4 w-4" /> New team admin
          </ButtonLink>
        </div>

        <Card>
          {error ? (
            <p className="p-4 text-sm text-tk-red dark:text-[#fca5a5]">{error.message}</p>
          ) : isLoading ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !teams?.length ? (
            <EmptyState
              icon={UsersRound}
              title="No teams yet"
              description="Create a team admin and give the team a name."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-tk-divider text-left text-xs font-semibold text-tk-muted dark:border-tk-dark-divider dark:text-tk-dark-muted">
                    <th className="px-4 py-2.5">Team</th>
                    <th className="w-28 px-4 py-2.5">Admins</th>
                    <th className="w-36 px-4 py-2.5">Accounts</th>
                    <th className="w-28 px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tk-divider dark:divide-tk-dark-divider">
                  {teams.map((t) => (
                    <tr key={t.slug}>
                      <td className="px-4 py-3">
                        {editing === t.slug ? (
                          <form
                            className="flex max-w-sm items-center gap-2"
                            onSubmit={(e) => {
                              e.preventDefault();
                              rename(t);
                            }}
                          >
                            <input
                              autoFocus
                              aria-label={`New name for ${t.name}`}
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                              maxLength={50}
                              className={inputClass}
                            />
                            <button type="submit" disabled={busy === t.slug} className={iconButton} aria-label="Save name">
                              <Check className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => setEditing(null)} className={iconButton} aria-label="Cancel">
                              <X className="h-4 w-4" />
                            </button>
                          </form>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot[teamTone(t.slug)]}`} />
                            <span className="font-medium">{t.name}</span>
                            <span className="text-xs text-tk-faint">/{t.slug}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {t.admins > 0 ? t.admins : <span className="text-tk-orange dark:text-[#fcd34d]">None</span>}
                      </td>
                      <td className="px-4 py-3 text-tk-muted dark:text-tk-dark-muted">
                        {t.active} active
                        {t.members > t.active && `, ${t.members - t.active} deactivated`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(t.slug);
                              setDraft(t.name);
                            }}
                            className={iconButton}
                            aria-label={`Rename ${t.name}`}
                            title="Rename"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={t.members > 0 || busy === t.slug}
                            onClick={() => setDeleting(t)}
                            className={iconButton}
                            aria-label={`Delete ${t.name}`}
                            title={t.members > 0 ? "Only teams without accounts can be deleted" : "Delete team"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!deleting}
        title={`Delete the ${deleting?.name} team?`}
        description="The team has no accounts. Teams that have projects can't be deleted."
        confirmLabel="Delete team"
        danger
        busy={busy === deleting?.slug}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting && (await send(deleting.slug, { method: "DELETE" }, `${deleting.name} deleted`))) setDeleting(null);
        }}
      />
    </div>
  );
}
