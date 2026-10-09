"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useTheme } from "components/theme-provider";
import { AlertTriangle, Eye, EyeOff, Loader2, Moon, Sun } from "lucide-react";
import { BrandMark } from "components/ui/kit";

const TEAMS = ["cloud", "devops", "pm"];

function dashboardFor(user: { role?: string; team?: string }) {
  if (user.role === "admin") return "/dashboard/admin";
  return TEAMS.includes(user.team ?? "") ? `/dashboard/${user.team}` : "/";
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-semibold">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
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
