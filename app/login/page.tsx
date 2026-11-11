"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useTheme } from "components/theme-provider";
import { AlertTriangle, Eye, EyeOff, Loader2, Moon, Sun } from "lucide-react";
import { BrandMark } from "components/ui/kit";
import { SUPERADMIN_HOME, isSuperadmin, isWorkTeamSlug } from "lib/roles";
import { DEMO_LOGINS, isDemo, type DemoLoginKey } from "lib/demo";

function dashboardFor(user: { role?: string; team?: string }) {
  if (isSuperadmin(user)) return SUPERADMIN_HOME;
  return isWorkTeamSlug(user.team) ? `/dashboard/${user.team}` : "/";
}

const inputClass =
  "h-9 w-full rounded-md border border-tk-border bg-tk-surface px-3 text-sm text-tk-text focus:border-tk-accent focus:outline-hidden focus:ring-2 focus:ring-tk-accent/20 dark:border-tk-dark-border dark:bg-tk-dark-surface dark:text-tk-dark-text";

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [demoBusy, setDemoBusy] = useState<DemoLoginKey | null>(null);
  const demo = isDemo();

  // Sudah login? Langsung ke dashboard.
  useEffect(() => {
    fetch("/api/jwt", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.user && router.replace(dashboardFor(data.user)))
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || "Sign in failed. Please try again.");
        setSubmitting(false);
        return;
      }

      router.push(dashboardFor(data));
    } catch {
      setError("Can't reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  };

  // Demo: masuk sekali klik ke akun contoh, tanpa password.
  const signInAsDemo = async (account: DemoLoginKey) => {
    setError("");
    setDemoBusy(account);
    try {
      const res = await fetch("/api/demo/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Sign in failed. Please try again.");
        setDemoBusy(null);
        return;
      }
      router.push(dashboardFor(data));
    } catch {
      setError("Can't reach the server. Check your connection and try again.");
      setDemoBusy(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-tk-bg text-tk-text dark:bg-tk-dark-bg dark:text-tk-dark-text">
      <header className="flex justify-end p-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-md p-2 text-tk-muted hover:bg-tk-subtle hover:text-tk-text dark:text-tk-dark-muted dark:hover:bg-tk-dark-subtle dark:hover:text-tk-dark-text"
          aria-label="Toggle theme"
          title={theme === "light" ? "Dark mode" : "Light mode"}
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pb-16 pt-4 sm:pt-12">
        <div className="flex flex-col items-center">
          <BrandMark size={40} />
          <h1 className="mt-4 text-xl font-semibold">Ticketing MS</h1>
        </div>

        <div className="mt-6 w-full max-w-[360px] rounded-lg border border-tk-border bg-tk-surface p-6 dark:border-tk-dark-border dark:bg-tk-dark-surface">
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-md border border-[#fecaca] bg-tk-red-soft px-3 py-2 text-sm text-tk-red dark:border-tk-red/40 dark:bg-tk-red/10 dark:text-[#fca5a5]"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {demo && (
            <div className="mb-5">
              <h2 className="text-sm font-semibold">Try the demo</h2>
              <p className="mt-1 text-xs text-tk-muted dark:text-tk-dark-muted">
                Pick a role to look around. Everything resets every day at 07:00 WIB (00:00 UTC).
              </p>
              <div className="mt-3 space-y-2">
                {DEMO_LOGINS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    disabled={!!demoBusy}
                    onClick={() => signInAsDemo(d.key)}
                    className="flex w-full items-start gap-3 rounded-md border border-tk-border px-3 py-2 text-left hover:border-tk-accent hover:bg-tk-subtle disabled:cursor-not-allowed disabled:opacity-60 dark:border-tk-dark-border dark:hover:bg-tk-dark-subtle"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{d.label}</span>
                      <span className="block text-xs text-tk-muted dark:text-tk-dark-muted">{d.description}</span>
                    </span>
                    {demoBusy === d.key && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-3 text-xs text-tk-faint">
                <span className="h-px flex-1 bg-tk-divider dark:bg-tk-dark-divider" />
                or sign in with an account you created
                <span className="h-px flex-1 bg-tk-divider dark:bg-tk-dark-divider" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-semibold">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus={!demo}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-semibold">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={clsx(inputClass, "pr-9")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-tk-faint hover:text-tk-text dark:hover:text-tk-dark-text"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-tk-accent text-sm font-medium text-white hover:bg-tk-accent-hover focus:outline-hidden focus-visible:ring-2 focus-visible:ring-tk-accent/40 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-tk-muted dark:text-tk-dark-muted">
          Don&apos;t have an account or forgot your password? Ask your admin.
        </p>
      </main>
    </div>
  );
}
