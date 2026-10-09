"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ChevronDown, LogOut, ShieldCheck, User } from "lucide-react";
import { Avatar, Badge, TEAM_LABEL } from "./kit";

type MenuUser = {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  role?: string;
  team?: string;
};

type Props = {
  user: MenuUser | null;
  profileHref: string;
  onSignOut: () => void;
};

const itemClass =
  "flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-tk-text outline-hidden hover:bg-tk-subtle focus-visible:bg-tk-subtle dark:text-tk-dark-text dark:hover:bg-tk-dark-subtle dark:focus-visible:bg-tk-dark-subtle";

// Menu akun ala GitLab: bisa dipakai dengan mouse maupun keyboard (Esc, panah, Home/End, Tab).
export default function UserMenu({ user, profileHref, onSignOut }: Props) {
  const pathname = usePathname();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "admin";

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Tutup saat pindah halaman.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Tutup saat klik di luar menu.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);

  // Fokus ke item pertama begitu menu terbuka.
  useEffect(() => {
    if (open) items()[0]?.focus();
  }, [open]);

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) => list[(i + list.length) % list.length]?.focus();

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "ArrowDown":
        e.preventDefault();
        focusAt(index + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusAt(index - 1);
        break;
      case "Home":
        e.preventDefault();
        focusAt(0);
        break;
      case "End":
        e.preventDefault();
        focusAt(list.length - 1);
        break;
      case "Tab":
        close();
        break;
    }
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && !open) {
      e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label="Account menu"
        className={clsx(
          "flex items-center gap-1.5 rounded-md p-1 hover:bg-tk-subtle focus:outline-hidden focus-visible:ring-2 focus-visible:ring-tk-accent/40 dark:hover:bg-tk-dark-subtle",
          open && "bg-tk-subtle dark:bg-tk-dark-subtle"
        )}
      >
        <Avatar name={user?.name} src={user?.avatarUrl} size={28} />
        <ChevronDown className={clsx("h-3.5 w-3.5 text-tk-faint transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-lg border border-tk-border bg-tk-surface py-1 shadow-lg dark:border-tk-dark-border dark:bg-tk-dark-surface"
        >
          <div className="flex items-center gap-3 border-b border-tk-divider px-4 py-3 dark:border-tk-dark-divider">
            <Avatar name={user?.name} src={user?.avatarUrl} size={40} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-tk-text dark:text-tk-dark-text">{user?.name ?? "Account"}</p>
                {user?.role &&
                  (isAdmin ? (
                    <Badge tone="accent">Admin</Badge>
                  ) : (
                    <Badge>{TEAM_LABEL[user.team ?? ""] ?? "Staff"}</Badge>
                  ))}
              </div>
              <p className="truncate text-xs text-tk-muted dark:text-tk-dark-muted">{user?.email}</p>
            </div>
          </div>

          <div className="py-1">
            <Link href={profileHref} role="menuitem" tabIndex={-1} onClick={() => close()} className={itemClass}>
              <User className="h-4 w-4 text-tk-muted dark:text-tk-dark-muted" /> Edit profile
            </Link>
            {isAdmin && (
              <Link
                href="/dashboard/admin/security"
                role="menuitem"
                tabIndex={-1}
                onClick={() => close()}
                className={itemClass}
              >
                <ShieldCheck className="h-4 w-4 text-tk-muted dark:text-tk-dark-muted" /> Account security
              </Link>
            )}
          </div>

          <div className="border-t border-tk-divider py-1 dark:border-tk-dark-divider">
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                close();
                onSignOut();
              }}
              className={clsx(
                itemClass,
                "hover:bg-tk-red-soft hover:text-tk-red focus-visible:bg-tk-red-soft focus-visible:text-tk-red dark:hover:bg-tk-red/10 dark:hover:text-[#fca5a5] dark:focus-visible:bg-tk-red/10 dark:focus-visible:text-[#fca5a5]"
              )}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
