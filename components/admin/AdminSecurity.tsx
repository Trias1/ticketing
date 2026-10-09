"use client";

import { ShieldCheck, UserX } from "lucide-react";
import { SecurityPanel, UserList } from "./AdminOverview";
import { TextLink, timeAgo } from "components/ui/kit";
import { useAdminOverview } from "./useAdminOverview";
import SecurityActivity from "./SecurityActivity";

export default function AdminSecurity() {
  const { data, isLoading } = useAdminOverview();

  return (
    <div className="min-h-full bg-tk-bg px-4 py-6 text-tk-text dark:bg-tk-dark-bg dark:text-tk-dark-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="border-b border-tk-divider pb-5 dark:border-tk-dark-divider">
          <h1 className="text-2xl font-semibold tracking-tight">Account security</h1>
          <p className="mt-1 text-sm text-tk-muted dark:text-tk-dark-muted">
            Security findings, sign-in activity, and accounts with elevated access.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <SecurityPanel data={data} loading={isLoading} />
          <div className="space-y-6">
            <UserList
              title="Admin accounts"
              users={data?.admins}
              loading={isLoading}
              meta={(u) => (u.online ? "Online now" : `Signed in ${timeAgo(u.lastLoginAt).toLowerCase()}`)}
              action={<TextLink href="/dashboard/admin/management-user">Manage roles</TextLink>}
              emptyIcon={ShieldCheck}
              emptyTitle="No admins yet"
            />
            <UserList
              title="Deactivated accounts"
              users={data?.blocked}
              loading={isLoading}
              meta={(u) => `Last sign-in: ${timeAgo(u.lastLoginAt).toLowerCase()}`}
              emptyIcon={UserX}
              emptyTitle="No deactivated accounts"
            />
          </div>
        </div>

        <SecurityActivity />
      </div>
    </div>
  );
}
