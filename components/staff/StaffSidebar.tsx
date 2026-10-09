"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Activity,
  FolderKanban,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Tag,
  Ticket,
  Users,
} from "lucide-react";
import { ProjectAvatar } from "components/ui/kit";
import JumpTo from "./JumpTo";
import ProjectSwitcher from "./ProjectSwitcher";
import { projectBase, rememberProject, useCurrentProject, useMyProjects } from "./hooks";

type Props = { isOpen: boolean; onToggle: () => void; homeTeam: string };

function NavLink({
  href,
  icon: Icon,
  label,
  count,
  active,
  collapsed,
}: {
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  label: React.ReactNode;
  count?: number;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      title={collapsed && typeof label === "string" ? label : undefined}
      className={clsx(
        "flex items-center gap-3 rounded-md py-1.5 text-sm transition-colors",
        collapsed ? "justify-center px-2" : "px-3",
        active
          ? "bg-tk-accent-soft font-semibold text-tk-accent dark:bg-tk-accent/25 dark:text-[#5eead4]"
          : "text-tk-muted hover:bg-black/4 hover:text-tk-text dark:text-tk-dark-muted dark:hover:bg-white/5 dark:hover:text-tk-dark-text"
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && count !== undefined && count > 0 && (
        <span
          className={clsx(
            "rounded-full px-1.5 text-xs tabular-nums",
            active ? "bg-[#cce9e3] dark:bg-tk-accent/40" : "bg-black/5 dark:bg-white/10"
          )}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

function SectionTitle({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  if (collapsed) return <div className="mx-3 my-2 border-t border-tk-border dark:border-tk-dark-border" />;
  return <p className="truncate px-3 pb-1 pt-4 text-xs font-semibold text-tk-faint">{children}</p>;
}

export default function StaffSidebar({ isOpen, onToggle, homeTeam }: Props) {
  const pathname = usePathname();
  const collapsed = !isOpen;
  const { data: projects = [] } = useMyProjects();
  const { project: current } = useCurrentProject();
  const [jumpOpen, setJumpOpen] = useState(false);

  useEffect(() => {
    if (current) rememberProject(current.id);
  }, [current]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setJumpOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const starred = projects.filter((p) => p.starred);
  const home = `/dashboard/${homeTeam}`;
  const base = current ? projectBase(current) : null;

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-tk-border bg-tk-subtle text-tk-text transition-[width] duration-200 dark:border-tk-dark-border dark:bg-[#151517] dark:text-tk-dark-text",
        isOpen ? "w-64" : "w-16"
      )}
    >
      <div className={clsx("flex items-center gap-1 p-2", collapsed && "flex-col")}>
        <div className="min-w-0 flex-1">
          <ProjectSwitcher collapsed={collapsed} homeTeam={homeTeam} />
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md p-1.5 text-tk-muted hover:bg-black/5 hover:text-tk-text dark:text-tk-dark-muted dark:hover:bg-white/5"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>
      </div>

      <div className="px-2">
        <button
          type="button"
          onClick={() => setJumpOpen(true)}
          title="Jump to… (Ctrl K)"
          className={clsx(
            "flex h-8 w-full items-center gap-2 rounded-md border border-tk-border bg-tk-surface px-2 text-sm text-tk-faint hover:border-[#d4d4d8] dark:border-tk-dark-border dark:bg-tk-dark-surface",
            collapsed && "justify-center"
          )}
        >
          <Search className="h-4 w-4" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Jump to…</span>
              <kbd className="rounded-sm border border-tk-border px-1 text-[11px] dark:border-tk-dark-border">Ctrl K</kbd>
            </>
          )}
        </button>
      </div>

      <nav className="mt-1 flex-1 overflow-y-auto px-2 pb-4">
        <SectionTitle collapsed={collapsed}>Your work</SectionTitle>
        <div className="space-y-0.5">
          <NavLink href={home} icon={Home} label="Dashboard" active={pathname === home} collapsed={collapsed} />
          <NavLink href={`${home}/issues`} icon={Ticket} label="My issues" active={pathname === `${home}/issues`} collapsed={collapsed} />
          <NavLink
            href={`${home}/project`}
            icon={FolderKanban}
            label="Projects"
            active={pathname === `${home}/project` || pathname === `${home}/project/new`}
            collapsed={collapsed}
          />
        </div>

        {starred.length > 0 && (
          <>
            <SectionTitle collapsed={collapsed}>Starred</SectionTitle>
            <div className="space-y-0.5">
              {starred.map((p) => (
                <Link
                  key={p.id}
                  href={`${projectBase(p)}/issues`}
                  title={collapsed ? p.name : undefined}
                  className={clsx(
                    "flex items-center gap-3 rounded-md py-1.5 text-sm text-tk-muted hover:bg-black/4 hover:text-tk-text dark:text-tk-dark-muted dark:hover:bg-white/5 dark:hover:text-tk-dark-text",
                    collapsed ? "justify-center px-2" : "px-3"
                  )}
                >
                  <ProjectAvatar name={p.name} color={p.color} icon={p.icon} size={18} />
                  {!collapsed && <span className="truncate">{p.name}</span>}
                </Link>
              ))}
            </div>
          </>
        )}

        {current && base && (
          <>
            <SectionTitle collapsed={collapsed}>Project</SectionTitle>
            <div className="space-y-0.5">
              <NavLink
                href={`${base}/issues`}
                icon={Ticket}
                label="Issues"
                count={current.openIssues}
                active={pathname.startsWith(`${base}/issues`)}
                collapsed={collapsed}
              />
              <NavLink href={`${base}/activity`} icon={Activity} label="Activity" active={pathname === `${base}/activity`} collapsed={collapsed} />
              <NavLink href={`${base}/members`} icon={Users} label="Members" active={pathname === `${base}/members`} collapsed={collapsed} />
              <NavLink href={`${base}/labels`} icon={Tag} label="Labels" active={pathname === `${base}/labels`} collapsed={collapsed} />
              <NavLink href={`${base}/settings`} icon={Settings} label="Settings" active={pathname === `${base}/settings`} collapsed={collapsed} />
            </div>
          </>
        )}
      </nav>

      <JumpTo homeTeam={homeTeam} open={jumpOpen} onClose={() => setJumpOpen(false)} />
    </aside>
  );
}
