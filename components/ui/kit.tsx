import Link from "next/link";
import clsx from "clsx";
import { KanbanSquare } from "lucide-react";

// Primitive UI area admin, gaya GitLab Pajamas: border tipis, radius kecil, tanpa gradien.

export function Card({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={clsx(
        "rounded-lg border border-tk-border bg-tk-surface dark:border-tk-dark-border dark:bg-tk-dark-surface",
        className
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-tk-divider px-4 py-3 dark:border-tk-dark-divider">
          <h2 className="text-sm font-semibold text-tk-text dark:text-tk-dark-text">{title}</h2>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-tk-accent hover:text-tk-accent-hover hover:underline dark:text-[#5eead4]"
    >
      {children}
    </Link>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "default";
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-tk-accent/40",
        variant === "primary"
          ? "bg-tk-accent text-white hover:bg-tk-accent-hover"
          : "border border-tk-border bg-tk-surface text-tk-text hover:bg-tk-subtle dark:border-tk-dark-border dark:bg-tk-dark-surface dark:text-tk-dark-text dark:hover:bg-tk-dark-subtle"
      )}
    >
      {children}
    </Link>
  );
}

const badgeTones = {
  neutral: "bg-tk-subtle text-tk-muted dark:bg-tk-dark-subtle dark:text-tk-dark-muted",
  accent: "bg-tk-accent-soft text-tk-accent dark:bg-tk-accent/25 dark:text-[#5eead4]",
  blue: "bg-tk-blue-soft text-tk-blue dark:bg-tk-blue/25 dark:text-[#93c5fd]",
  violet: "bg-tk-violet-soft text-tk-violet dark:bg-tk-violet/25 dark:text-[#c4b5fd]",
  green: "bg-tk-green-soft text-tk-green dark:bg-tk-green/20 dark:text-[#86efac]",
  orange: "bg-tk-orange-soft text-tk-orange dark:bg-[#ab6100]/25 dark:text-[#fcd34d]",
  red: "bg-tk-red-soft text-tk-red dark:bg-tk-red/20 dark:text-[#fca5a5]",
} as const;

export type BadgeTone = keyof typeof badgeTones;

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        badgeTones[tone]
      )}
    >
      {children}
    </span>
  );
}

export const TEAM_TONE: Record<string, BadgeTone> = {
  cloud: "blue",
  devops: "orange",
  pm: "violet",
  admin: "neutral",
};

export const TEAM_LABEL: Record<string, string> = {
  cloud: "Cloud",
  devops: "DevOps",
  pm: "PM",
  admin: "Admin",
};

export function TeamBadge({ team }: { team: string }) {
  return <Badge tone={TEAM_TONE[team] ?? "neutral"}>{TEAM_LABEL[team] ?? team}</Badge>;
}

const avatarColors = ["#0f766e", "#1d4ed8", "#6d28d9", "#a16207", "#b91c1c", "#be185d"];

export function initials(name?: string | null) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return (words[0][0] + (words[1]?.[0] ?? "")).toUpperCase();
}

export function Avatar({
  name,
  src,
  size = 32,
  online,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  online?: boolean;
}) {
  const color = avatarColors[(name ?? "").length % avatarColors.length];
  const hasImage = !!src && src !== "/avatarDefault.png";

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {hasImage ? (
        <img src={src!} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white"
          style={{ backgroundColor: color, fontSize: size * 0.38 }}
        >
          {initials(name)}
        </span>
      )}
      {online !== undefined && (
        <span
          className={clsx(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-tk-surface dark:border-tk-dark-surface",
            online ? "bg-[#2da160]" : "bg-tk-faint"
          )}
          title={online ? "Online" : "Offline"}
        />
      )}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-tk-subtle text-tk-faint dark:bg-tk-dark-subtle dark:text-tk-dark-faint">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold text-tk-text dark:text-tk-dark-text">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-tk-muted dark:text-tk-dark-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-sm bg-tk-divider dark:bg-tk-dark-subtle", className)} />;
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(value?: string | Date | null) {
  if (!value) return "Never";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return formatDate(value);
}

// Dialog konfirmasi di dalam app. Jangan pakai window.confirm(): bisa diblokir browser.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}
      onKeyDown={(e) => e.key === "Escape" && !busy && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-lg border border-tk-border bg-tk-surface shadow-xl dark:border-tk-dark-border dark:bg-tk-dark-surface"
      >
        <div className="border-b border-tk-divider px-5 py-4 dark:border-tk-dark-divider">
          <h2 id="confirm-title" className="text-base font-semibold text-tk-text dark:text-tk-dark-text">
            {title}
          </h2>
        </div>
        {description && (
          <div className="px-5 py-4 text-sm text-tk-muted dark:text-tk-dark-muted">{description}</div>
        )}
        <div className="flex justify-end gap-2 border-t border-tk-divider px-5 py-3 dark:border-tk-dark-divider">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-8 items-center rounded-md border border-tk-border px-3 text-sm font-medium text-tk-text hover:bg-tk-subtle disabled:opacity-60 dark:border-tk-dark-border dark:text-tk-dark-text dark:hover:bg-tk-dark-subtle"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            autoFocus
            className={clsx(
              "inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-white disabled:opacity-60",
              danger ? "bg-tk-red hover:bg-[#991b1b]" : "bg-tk-accent hover:bg-tk-accent-hover"
            )}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Logo aplikasi: dipakai di sidebar dan halaman login supaya identitasnya konsisten.
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-md bg-tk-accent text-white"
      style={{ width: size, height: size }}
    >
      <KanbanSquare style={{ width: size * 0.55, height: size * 0.55 }} />
    </span>
  );
}

// Ikon project: emoji/ikon pilihan atau huruf pertama, dengan warna project.
export function ProjectAvatar({
  name,
  color,
  icon,
  size = 28,
}: {
  name: string;
  color?: string | null;
  icon?: string | null;
  size?: number;
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-md font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: color || "#0f766e", fontSize: size * 0.45 }}
      aria-hidden
    >
      {icon || name.trim()[0]?.toUpperCase() || "?"}
    </span>
  );
}

// Chip label berwarna; warna teks menyesuaikan terang/gelapnya latar.
export function LabelChip({ name, color, size = "md" }: { name: string; color: string; size?: "sm" | "md" }) {
  const hex = color.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const light = (r * 299 + g * 587 + b * 114) / 1000 > 150;
  return (
    <span
      className={clsx(
        "inline-flex max-w-[160px] items-center truncate rounded-full font-semibold",
        size === "sm" ? "h-[18px] px-1.5 text-[11px]" : "h-5 px-2 text-xs"
      )}
      style={{ backgroundColor: color, color: light ? "#18181b" : "#ffffff" }}
      title={name}
    >
      {name}
    </span>
  );
}
