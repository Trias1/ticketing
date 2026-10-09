"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import { LogOut, Search, UserPlus, Users } from "lucide-react";
import { Avatar, Badge, ConfirmDialog, EmptyState, Skeleton, TeamBadge, formatDate } from "components/ui/kit";
import { fetcher, sendJson, useProject } from "../hooks";
import Popover from "./Popover";
import PageTitle from "./ProjectHeader";

type Member = { id: string; name: string; email: string; avatarUrl: string | null; team: string; role: "owner" | "member"; isActive: boolean | null; joinedAt: string };
type Candidate = { id: string; name: string; email: string; team: string; avatarUrl: string | null };
type MembersResponse = { members: Member[]; candidates: Candidate[]; role: "owner" | "member" };

export default function MembersPage({ projectId, currentUserId, homeTeam }: { projectId: string; currentUserId: string; homeTeam: string }) {
  const router = useRouter();
  const key = `/api/projects/${projectId}/members`;
  const { data, isLoading, mutate } = useSWR<MembersResponse>(key, fetcher);
  const { mutate: refreshProject } = useProject(projectId);
  const [query, setQuery] = useState("");
  const [removing, setRemoving] = useState<Member | null>(null);
  const isOwner = data?.role === "owner";

  const refresh = () => Promise.all([mutate(), refreshProject(), globalMutate("/api/me/projects")]);

  const add = async (c: Candidate) => {
    try {
      await sendJson(key, "POST", { userId: c.id });
      await refresh();
      toast.success(`${c.name} added`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add member");
    }
  };

  const setRole = async (m: Member, role: "owner" | "member") => {
    try {
      await sendJson(`${key}/${m.id}`, "PATCH", { role });
      await refresh();
      toast.success(`${m.name} is now ${role === "owner" ? "an owner" : "a member"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't change role");
    }
  };

  const remove = async (m: Member) => {
    try {
      await sendJson(`${key}/${m.id}`, "DELETE");
      if (m.id === currentUserId) {
        await globalMutate("/api/me/projects");
        toast.success("You left the project");
        router.push(`/dashboard/${homeTeam}/project`);
        return;
      }
      await refresh();
      toast.success(`${m.name} removed`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove member");
    }
  };

  const candidates = (data?.candidates ?? []).filter(
    (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageTitle
          title="Members"
          count={data?.members.length}
          actions={
            isOwner && (
            <Popover
              align="right"
              width={320}
              onOpenChange={() => setQuery("")}
              trigger={({ toggle }) => (
                <button type="button" onClick={toggle} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-tk-accent px-3 text-sm font-medium text-white hover:bg-tk-accent-hover">
                  <UserPlus className="h-4 w-4" /> Add member
                </button>
              )}
            >
              {(close) => (
                <>
                  <label className="flex h-9 items-center gap-2 border-b border-tk-divider px-3 dark:border-tk-dark-divider">
                    <Search className="h-4 w-4 text-tk-faint" />
                    <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search staff by name or email" className="w-full bg-transparent text-sm outline-hidden placeholder:text-tk-faint" />
                  </label>
                  <div className="max-h-72 overflow-y-auto py-1">
                    {candidates.length === 0 && <p className="px-3 py-3 text-sm text-tk-muted">Everyone is already a member.</p>}
                    {candidates.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          close();
                          add(c);
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-tk-subtle dark:hover:bg-tk-dark-subtle"
                      >
                        <Avatar name={c.name} src={c.avatarUrl} size={26} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{c.name}</span>
                          <span className="block truncate text-xs text-tk-muted">{c.email}</span>
                        </span>
                        <TeamBadge team={c.team} />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Popover>
            )
          }
        />

        <div className="overflow-hidden rounded-lg border border-tk-border bg-tk-surface dark:border-tk-dark-border dark:bg-tk-dark-surface">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !data?.members.length ? (
            <EmptyState icon={Users} title="No members" />
          ) : (
            <ul className="divide-y divide-tk-divider dark:divide-tk-dark-divider">
              {data.members.map((m) => {
                const isMe = m.id === currentUserId;
                return (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Avatar name={m.name} src={m.avatarUrl} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{m.name}</span>
                        {isMe && <Badge tone="accent">You</Badge>}
                        {m.isActive === false && <Badge tone="red">Deactivated</Badge>}
                        <TeamBadge team={m.team} />
                      </div>
                      <p className="truncate text-xs text-tk-muted dark:text-tk-dark-muted">
                        {m.email} · joined {formatDate(m.joinedAt)}
                      </p>
                    </div>
                    {isOwner && !isMe ? (
                      <select
                        value={m.role}
                        onChange={(e) => setRole(m, e.target.value as "owner" | "member")}
                        aria-label={`Role for ${m.name}`}
                        className="h-8 rounded-md border border-tk-border bg-tk-surface px-2 text-sm dark:border-tk-dark-border dark:bg-tk-dark-surface"
                      >
                        <option value="member">Member</option>
                        <option value="owner">Owner</option>
                      </select>
                    ) : (
                      <Badge tone={m.role === "owner" ? "accent" : "neutral"}>{m.role === "owner" ? "Owner" : "Member"}</Badge>
                    )}
                    {(isOwner || isMe) && (
                      <button
                        type="button"
                        onClick={() => setRemoving(m)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-tk-border px-3 text-sm text-tk-red hover:bg-tk-red-soft dark:border-tk-dark-border dark:text-[#fca5a5] dark:hover:bg-tk-red/10"
                      >
                        {isMe ? (
                          <>
                            <LogOut className="h-4 w-4" /> Leave
                          </>
                        ) : (
                          "Remove"
                        )}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <p className="text-xs text-tk-faint">Owners manage members, labels, and board columns. Members work on issues.</p>
      </div>

      <ConfirmDialog
        open={!!removing}
        title={removing?.id === currentUserId ? "Leave this project?" : `Remove ${removing?.name ?? ""}?`}
        description={
          removing?.id === currentUserId
            ? "You'll lose access to its issues until an owner adds you again."
            : "They'll lose access to this project. Issues assigned to them become unassigned."
        }
        confirmLabel={removing?.id === currentUserId ? "Leave project" : "Remove member"}
        danger
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          const m = removing;
          setRemoving(null);
          if (m) remove(m);
        }}
      />
    </div>
  );
}
