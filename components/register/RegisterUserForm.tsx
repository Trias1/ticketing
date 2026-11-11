"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { toast } from "sonner";
import { AlertTriangle, Eye, EyeOff, KeyRound } from "lucide-react";
import PasswordStrength from "components/ui/PasswordStrength";
import { checkPassword } from "lib/password-policy";
import { TeamName, useTeams } from "components/ui/team";

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

// viewer = yang sedang membuat akun. Superadmin membuat admin untuk tim yang dipilih; admin membuat user di timnya sendiri.
export default function RegisterUserForm({ viewer }: { viewer: { role: string; team: string } }) {
  const router = useRouter();
  const superadmin = viewer.role === "superadmin";
  const listHref = `/dashboard/${viewer.team}/management-user`;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Superadmin: biasanya tim baru untuk admin baru (newTeam), atau pilih tim yang sudah ada (team).
  const { data: teams = [] } = useTeams();
  const [teamMode, setTeamMode] = useState<"new" | "existing">("new");
  const [newTeam, setNewTeam] = useState("");
  const [team, setTeam] = useState("");
  const existingTeam = team || teams[0]?.slug || "";
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);



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
        body: JSON.stringify(
          superadmin
            ? teamMode === "new"
              ? { name, email, password, newTeam }
              : { name, email, password, team: existingTeam }
            : { name, email, password }
        ),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.message || "Failed to create user");
        return;
      }

      toast.success(`User ${name} created`);
      router.replace(listHref);
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
          <h1 className="text-2xl font-semibold tracking-tight">{superadmin ? "New team admin" : "New user"}</h1>
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

          {superadmin ? (
            <Section title="Access" description="You create the admin of a team. Admins then create the users of their own team.">
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Team</legend>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="team-mode" checked={teamMode === "new"} onChange={() => setTeamMode("new")} className="accent-tk-accent" />
                    New team
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="team-mode"
                      checked={teamMode === "existing"}
                      onChange={() => setTeamMode("existing")}
                      disabled={teams.length === 0}
                      className="accent-tk-accent"
                    />
                    Existing team
                  </label>
                </div>
              </fieldset>
              {teamMode === "new" ? (
                <Field label="Team name" htmlFor="new-team" hint="You can rename the team later on the Teams page.">
                  <input
                    id="new-team"
                    value={newTeam}
                    onChange={(e) => setNewTeam(e.target.value)}
                    required
                    maxLength={50}
                    autoComplete="off"
                    className={inputClass}
                    placeholder="e.g. Network Operations"
                  />
                </Field>
              ) : (
                <Field label="Team" htmlFor="team">
                  <select id="team" value={existingTeam} onChange={(e) => setTeam(e.target.value)} className={inputClass}>
                    {teams.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <p className="rounded-md border border-tk-divider bg-tk-subtle px-3 py-2 text-sm text-tk-muted dark:border-tk-dark-divider dark:bg-tk-dark-subtle dark:text-tk-dark-muted">
                This account will be the <span className="font-semibold">Admin</span> of{" "}
                {teamMode === "new" ? (
                  newTeam.trim() ? <>the new <span className="font-semibold">{newTeam.trim()}</span> team</> : "a new team"
                ) : (
                  <>the <span className="font-semibold"><TeamName team={existingTeam} /></span> team</>
                )}
                . Admins work in projects and manage the user accounts of their team.
              </p>
            </Section>
          ) : (
            <Section title="Access" description="Accounts you create join your team.">
              <p className="rounded-md border border-tk-divider bg-tk-subtle px-3 py-2 text-sm text-tk-muted dark:border-tk-dark-divider dark:bg-tk-dark-subtle dark:text-tk-dark-muted">
                This account will be a <span className="font-semibold">User</span> in the{" "}
                <span className="font-semibold"><TeamName team={viewer.team} /></span> team. Project owners add
                users to their projects.
              </p>
            </Section>
          )}

          <div className="flex items-center gap-2 border-t border-tk-divider py-5 dark:border-tk-dark-divider">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-9 items-center rounded-md bg-tk-accent px-4 text-sm font-medium text-white hover:bg-tk-accent-hover disabled:opacity-60"
            >
              {submitting ? "Creating account..." : superadmin ? "Create admin" : "Create user"}
            </button>
            <Link
              href={listHref}
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
