"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { BrandMark } from "components/ui/kit";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: "Members",
    items: [
      { name: "Users", href: "/dashboard/admin/management-user", icon: Users },
      { name: "New user", href: "/dashboard/admin/register-user", icon: UserPlus },
    ],
  },
  {
    title: "Security",
    items: [
      { name: "Account security", href: "/dashboard/admin/security", icon: ShieldCheck },
    ],
  },
];

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

type Props = {
  isOpen: boolean;
  onToggle: () => void;
};

export default function AdminSidebar({ isOpen, onToggle }: Props) {
  const pathname = usePathname();

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-tk-border bg-tk-subtle text-tk-text transition-[width] duration-200 dark:border-tk-dark-border dark:bg-[#151517] dark:text-tk-dark-text",
        isOpen ? "w-64" : "w-16"
      )}
    >
      {/* Brand */}
      <div className={clsx("flex h-14 items-center gap-2 px-3", !isOpen && "justify-center px-2")}>
        <Link
          href="/dashboard/admin"
          className="flex min-w-0 items-center gap-2 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5"
          title="Administration"
        >
          <BrandMark size={32} />
          {isOpen && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-tight">Ticketing MS</span>
              <span className="block text-xs leading-tight text-tk-muted dark:text-tk-dark-muted">Administration</span>
            </span>
          )}
        </Link>
        {isOpen && (
          <button
            type="button"
            onClick={onToggle}
            className="ml-auto rounded-md p-1.5 text-tk-muted hover:bg-black/5 hover:text-tk-text dark:text-tk-dark-muted dark:hover:bg-white/5 dark:hover:text-tk-dark-text"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {!isOpen && (
          <button
            type="button"
            onClick={onToggle}
            className="mb-2 flex w-full justify-center rounded-md p-2 text-tk-muted hover:bg-black/5 dark:text-tk-dark-muted dark:hover:bg-white/5"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        {sections.map((section) => (
          <div key={section.title} className="mt-3 first:mt-1">
            {isOpen ? (
              <p className="px-3 pb-1 pt-2 text-xs font-semibold text-tk-faint dark:text-tk-dark-faint">
                {section.title}
              </p>
            ) : (
              <div className="mx-3 my-2 border-t border-tk-border dark:border-tk-dark-border" />
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={!isOpen ? item.name : undefined}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "relative flex items-center gap-3 rounded-md py-1.5 text-sm transition-colors",
                        isOpen ? "px-3" : "justify-center px-2",
                        active
                          ? "bg-tk-accent-soft font-semibold text-tk-accent dark:bg-tk-accent/25 dark:text-[#5eead4]"
                          : "text-tk-muted hover:bg-black/4 hover:text-tk-text dark:text-tk-dark-muted dark:hover:bg-white/5 dark:hover:text-tk-dark-text"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {isOpen && <span className="truncate">{item.name}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

    </aside>
  );
}
