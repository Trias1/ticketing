"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { toast } from "sonner";
import { AlertTriangle, Eye, EyeOff, KeyRound, ShieldCheck, User } from "lucide-react";
import PasswordStrength from "components/ui/PasswordStrength";
import { checkPassword } from "lib/password-policy";

type Role = "admin" | "staff";
type Team = "admin" | "cloud" | "devops" | "pm";

const STAFF_TEAMS: { value: Team; label: string; hint: string }[] = [
  { value: "cloud", label: "Cloud", hint: "Cloud team workspace" },
  { value: "devops", label: "DevOps", hint: "DevOps team workspace" },
  { value: "pm", label: "Project Manager", hint: "Project management team workspace" },
];

const ROLE_OPTIONS: { value: Role; label: string; hint: string; icon: typeof User }[] = [
  { value: "staff", label: "Staff", hint: "Works in their team workspace: projects and tickets.", icon: User },
  { value: "admin", label: "Admin", hint: "Manages members and security. Does not handle tickets.", icon: ShieldCheck },
];

const inputClass =
  "h-9 w-full rounded-md border border-tk-border bg-tk-surface px-3 text-sm text-tk-text placeholder:text-tk-faint focus:border-tk-accent focus:outline-hidden focus:ring-2 focus:ring-tk-accent/20 dark:border-tk-dark-border dark:bg-tk-dark-surface dark:text-tk-dark-text";

// Password sementara acak (16 karakter) tanpa karakter yang mirip; user wajib menggantinya
// saat login pertama. Diulang sampai lolos aturan password (praktis selalu langsung lolos).
function generatePassword(length = 16) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  for (;;) {
    const bytes = new Uint32Array(length);
    crypto.getRandomValues(bytes);
    const pw = Array.from(bytes, (b) => chars[b % chars.length]).join("");
    if (checkPassword(pw).ok) return pw;
  }
}

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold text-tk-text dark:text-tk-dark-text">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-tk-muted dark:text-tk-dark-muted">{hint}</p>}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-tk-divider py-6 last:border-b-0 dark:border-tk-dark-divider lg:grid-cols-3 lg:gap-8">
      <div>
        <h2 className="text-base font-semibold text-tk-text dark:text-tk-dark-text">{title}</h2>
        <p className="mt-1 text-sm text-tk-muted dark:text-tk-dark-muted">{description}</p>
      </div>
      <div className="space-y-4 lg:col-span-2">{children}</div>
    </section>
  );
}

export default function RegisterUserForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>("staff");
  const [team, setTeam] = useState<Team>("cloud");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const chooseRole = (next: Role) => {
    setRole(next);
    setTeam(next === "admin" ? "admin" : "cloud");
  };

  const chooseTeam = (next: Team) => {
    setTeam(next);
  };


  const handleGenerate = () => {
    setPassword(generatePassword());
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    const check = checkPassword(password, { email, name });
    if (!check.ok) {
      setMessage(check.errors[0]);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, team }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.message || "Failed to create user");
        return;
      }

      toast.success(`User ${name} created`);
      router.replace("/dashboard/admin/management-user");
    } catch {
      setMessage("Something went wrong while creating the user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-tk-bg px-4 py-6 text-tk-text dark:bg-tk-dark-bg dark:text-tk-dark-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="border-b border-tk-divider pb-5 dark:border-tk-dark-divider">
          <h1 className="text-2xl font-semibold tracking-tight">New user</h1>
          <p className="mt-1 text-sm text-tk-muted dark:text-tk-dark-muted">
            Create an account for a new member. Share the password through a secure channel.
          </p>
        </div>

        {message && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-lg border border-[#fecaca] bg-tk-red-soft px-4 py-3 text-sm text-tk-red dark:border-tk-red/40 dark:bg-tk-red/10 dark:text-[#fca5a5]"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Section title="Account" description="Name and email used to sign in.">
            <Field label="Name" htmlFor="name">
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                autoComplete="off"
                className={inputClass}
                placeholder="Full name"
              />
            </Field>
            <Field label="Email" htmlFor="email" hint="Used as the username when signing in.">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={100}
                autoComplete="off"
                className={inputClass}
                placeholder="name@company.com"
              />
            </Field>
            <Field
              label="Temporary password"
              htmlFor="password"
              hint="The user must replace it with their own password the first time they sign in."
            >
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={10}
                    autoComplete="new-password"
                    className={clsx(inputClass, "pr-9 font-mono")}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-tk-faint hover:text-tk-text dark:hover:text-tk-dark-text"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-tk-border bg-tk-surface px-3 text-sm font-medium hover:bg-tk-subtle dark:border-tk-dark-border dark:bg-tk-dark-surface dark:hover:bg-tk-dark-subtle"
                >
                  <KeyRound className="h-4 w-4" /> Generate
                </button>
              </div>
              <PasswordStrength password={password} context={{ email, name }} />
            </Field>
          </Section>

          <Section title="Access" description="The role decides what the user can do. Staff work inside their team workspace.">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Role</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {ROLE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = role === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={clsx(
                        "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                        selected
                          ? "border-tk-accent bg-tk-accent-soft/60 ring-1 ring-tk-accent dark:bg-tk-accent/10"
                          : "border-tk-border hover:border-[#d4d4d8] dark:border-tk-dark-border dark:hover:border-[#3f3f46]"
                      )}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={opt.value}
                        checked={selected}
                        onChange={() => chooseRole(opt.value)}
                        className="mt-1 accent-tk-accent"
                      />
                      <span>
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          <Icon className="h-4 w-4" /> {opt.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-tk-muted dark:text-tk-dark-muted">{opt.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {role === "staff" ? (
              <Field label="Team" htmlFor="team">
                <select
                  id="team"
                  value={team}
                  onChange={(e) => chooseTeam(e.target.value as Team)}
                  className={inputClass}
                >
                  {STAFF_TEAMS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-tk-muted dark:text-tk-dark-muted">
                  {STAFF_TEAMS.find((t) => t.value === team)?.hint}
                </p>
              </Field>
            ) : (
              <p className="rounded-md border border-tk-divider bg-tk-subtle px-3 py-2 text-sm text-tk-muted dark:border-tk-dark-divider dark:bg-tk-dark-subtle dark:text-tk-dark-muted">
                Admins are automatically placed in the <span className="font-semibold">Admin</span> team.
              </p>
            )}
          </Section>

          <div className="flex items-center gap-2 border-t border-tk-divider py-5 dark:border-tk-dark-divider">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-9 items-center rounded-md bg-tk-accent px-4 text-sm font-medium text-white hover:bg-tk-accent-hover disabled:opacity-60"
            >
              {submitting ? "Creating user..." : "Create user"}
            </button>
            <Link
              href="/dashboard/admin/management-user"
              className="inline-flex h-9 items-center rounded-md border border-tk-border px-4 text-sm font-medium hover:bg-tk-subtle dark:border-tk-dark-border dark:hover:bg-tk-dark-subtle"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
