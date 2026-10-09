"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "components/theme-provider";
import { ChevronRight, Moon, Sun } from "lucide-react";
import UserMenu from "components/ui/UserMenu";
import { PROFILE_UPDATED_EVENT } from "components/profile/ProfileSettings";
import { useCurrentProject } from "components/staff/hooks";

type CurrentUser = {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  role?: string;
  team?: string;
};

type Crumb = { label: string; href: string };

const ADMIN_PAGES: Record<string, string> = {
  "management-user": "Users",
  "register-user": "New user",
  security: "Account security",
  profile: "Edit profile",
  statistik: "Statistics",
};

const PROJECT_PAGES: Record<string, string> = {
  activity: "Activity",
  members: "Members",
  labels: "Labels",
  settings: "Settings",
};

function adminCrumbs(pathname: string): Crumb[] {
  const crumbs: Crumb[] = [{ label: "Administration", href: "/dashboard/admin" }];
  const page = pathname.split("/")[3];
  if (page && ADMIN_PAGES[page]) crumbs.push({ label: ADMIN_PAGES[page], href: pathname });
  return crumbs;
}

function staffCrumbs(pathname: string, projectName: string | null): Crumb[] {
  const [, , team, section, slug, page, sub] = pathname.split("/");
  const home = `/dashboard/${team}`;

  if (!section) return [{ label: "Dashboard", href: home }];
  if (section === "issues") return [{ label: "My issues", href: `${home}/issues` }];
  if (section === "profile") return [{ label: "Edit profile", href: `${home}/profile` }];
  if (section !== "project") return [{ label: "Dashboard", href: home }];

  const crumbs: Crumb[] = [{ label: "Projects", href: `${home}/project` }];
  if (!slug) return crumbs;
  if (slug === "new") return [...crumbs, { label: "New project", href: pathname }];

  const base = `/dashboard/${team}/project/${slug}`;
  crumbs.push({ label: projectName ?? slug, href: `${base}/issues` });
  if (page === "issues" || page === "tiket") {
    crumbs.push({ label: "Issues", href: `${base}/issues` });
    if (sub === "new") crumbs.push({ label: "New issue", href: pathname });
    else if (sub && /^\d+$/.test(sub)) crumbs.push({ label: `#${sub}`, href: pathname });
  } else if (page && PROJECT_PAGES[page]) {
    crumbs.push({ label: PROJECT_PAGES[page], href: pathname });
  }
  return crumbs;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const { theme, toggleTheme } = useTheme();
  const { project } = useCurrentProject();

  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch("/api/jwt", { credentials: "include" });
      if (!res.ok) return;
      const { user } = await res.json();
      setUser(user);
    };
    fetchUser();
    window.addEventListener(PROFILE_UPDATED_EVENT, fetchUser);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, fetchUser);
  }, []);

  useEffect(() => {
    const sendHeartbeat = async () => {
      const res = await fetch("/api/heartbeat", {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 401) router.push("/login");
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30_000);
    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  // Sebelum data user termuat, tebak dari URL.
  const isAdmin = user ? user.role === "admin" : pathname.startsWith("/dashboard/admin");
  const crumbs = isAdmin ? adminCrumbs(pathname) : staffCrumbs(pathname, project?.name ?? null);
  const profileHref = isAdmin ? "/dashboard/admin/profile" : `/dashboard/${user?.team ?? pathname.split("/")[2]}/profile`;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-tk-border bg-tk-surface/95 px-4 backdrop-blur-sm dark:border-tk-dark-border dark:bg-tk-dark-surface/95 sm:px-6">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={c.href + i} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-tk-faint" />}
              {last ? (
                <span className="truncate font-semibold text-tk-text dark:text-tk-dark-text">{c.label}</span>
              ) : (
                <Link
                  href={c.href}
                  className="truncate text-tk-muted hover:text-tk-text hover:underline dark:text-tk-dark-muted dark:hover:text-tk-dark-text"
                >
                  {c.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-md p-2 text-tk-muted hover:bg-tk-subtle hover:text-tk-text dark:text-tk-dark-muted dark:hover:bg-tk-dark-subtle dark:hover:text-tk-dark-text"
          aria-label="Toggle theme"
          title={theme === "light" ? "Dark mode" : "Light mode"}
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
        <UserMenu user={user} profileHref={profileHref} onSignOut={handleLogout} />
      </div>
    </header>
  );
}
