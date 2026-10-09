"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import clsx from "clsx";
import { toast } from "sonner";
import { AlertTriangle, Eye, EyeOff, KeyRound, Upload } from "lucide-react";
import { Avatar, Badge, Skeleton, TeamBadge } from "components/ui/kit";
import PasswordStrength from "components/ui/PasswordStrength";
import { checkPassword } from "lib/password-policy";

type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string;
  avatarUrl?: string | null;
  mustChangePassword?: boolean;
};

const DEFAULT_AVATAR = "/avatarDefault.png";
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

// Event yang didengar Navbar & Sidebar supaya nama/avatar langsung ikut berubah.
export const PROFILE_UPDATED_EVENT = "profile:updated";

const inputClass =
  "h-9 w-full rounded-md border border-tk-border bg-tk-surface px-3 text-sm text-tk-text placeholder:text-tk-faint focus:border-tk-accent focus:outline-hidden focus:ring-2 focus:ring-tk-accent/20 disabled:bg-tk-subtle disabled:text-tk-muted dark:border-tk-dark-border dark:bg-tk-dark-surface dark:text-tk-dark-text dark:disabled:bg-tk-dark-subtle";

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? "Failed to load profile");
  return res.json();
};

async function saveProfile(body: Record<string, unknown>) {
  const res = await fetch("/api/profileusers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to update profile");
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-tk-divider py-6 last:border-b-0 dark:border-tk-dark-divider lg:grid-cols-3 lg:gap-8">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-tk-muted dark:text-tk-dark-muted">{description}</p>
      </div>
      <div className="lg:col-span-2">{children}</div>
    </section>
  );
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold">
      {children}
    </label>
  );
}

function PrimaryButton({ busy, children, disabled }: { busy: boolean; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className="inline-flex h-9 items-center rounded-md bg-tk-accent px-4 text-sm font-medium text-white hover:bg-tk-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? "Saving..." : children}
    </button>
  );
}

export default function ProfileSettings() {
  const { data: profile, error, mutate } = useSWR<Profile>("/api/profileusers", fetcher);

  // Akun baru / password direset admin / password lama terlalu lemah: hanya form password.
  if (profile?.mustChangePassword) return <RequiredPasswordChange profile={profile} />;

  return (
    <div className="min-h-full bg-tk-bg px-4 py-6 text-tk-text dark:bg-tk-dark-bg dark:text-tk-dark-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="border-b border-tk-divider pb-5 dark:border-tk-dark-divider">
          <h1 className="text-2xl font-semibold tracking-tight">Edit profile</h1>
          <p className="mt-1 text-sm text-tk-muted dark:text-tk-dark-muted">
            Update your avatar, name, email, and password.
          </p>
        </div>

        {error ? (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#fecaca] bg-tk-red-soft px-4 py-3 text-sm text-tk-red dark:border-tk-red/40 dark:bg-tk-red/10 dark:text-[#fca5a5]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error.message}
          </div>
        ) : !profile ? (
          <div className="space-y-4 py-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <AvatarSection profile={profile} onSaved={(avatarUrl) => mutate({ ...profile, avatarUrl }, { revalidate: false })} />
            <MainSettings profile={profile} onSaved={(patch) => mutate({ ...profile, ...patch }, { revalidate: false })} />
            <PasswordSection profile={profile} />
          </>
        )}
      </div>
    </div>
  );
}

function notifyProfileUpdated() {
  window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
}

function AvatarSection({ profile, onSaved }: { profile: Profile; onSaved: (avatarUrl: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hasCustomAvatar = !!profile.avatarUrl && profile.avatarUrl !== DEFAULT_AVATAR;

  // Bersihkan object URL preview supaya tidak bocor memori.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!AVATAR_TYPES.includes(f.type)) return toast.error("Unsupported image format (JPG, PNG, or WEBP only)");
    if (f.size > AVATAR_MAX_BYTES) return toast.error("Image must be 2MB or smaller");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploadavatar", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to upload avatar");
      await saveProfile({ avatarUrl: data.url });
      onSaved(data.url);
      reset();
      notifyProfileUpdated();
      toast.success("Photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload avatar");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await saveProfile({ avatarUrl: DEFAULT_AVATAR });
      onSaved(DEFAULT_AVATAR);
      notifyProfileUpdated();
      toast.success("Photo removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove avatar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Profile photo" description="Shown next to your name across the app. JPG, PNG, or WEBP, up to 2MB.">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar name={profile.name} src={preview ?? profile.avatarUrl} size={96} />
        <div className="space-y-2">
          <p className="text-sm text-tk-muted dark:text-tk-dark-muted">
            {file ? (
              <>
                Selected: <span className="font-medium text-tk-text dark:text-tk-dark-text">{file.name}</span>
              </>
            ) : (
              "No file chosen."
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={AVATAR_TYPES.join(",")}
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            {file ? (
              <>
                <button
                  type="button"
                  onClick={upload}
                  disabled={busy}
                  className="inline-flex h-8 items-center rounded-md bg-tk-accent px-3 text-sm font-medium text-white hover:bg-tk-accent-hover disabled:opacity-60"
                >
                  {busy ? "Uploading..." : "Save photo"}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  disabled={busy}
                  className="inline-flex h-8 items-center rounded-md border border-tk-border px-3 text-sm font-medium hover:bg-tk-subtle dark:border-tk-dark-border dark:hover:bg-tk-dark-subtle"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={busy}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-tk-border px-3 text-sm font-medium hover:bg-tk-subtle disabled:opacity-60 dark:border-tk-dark-border dark:hover:bg-tk-dark-subtle"
                >
                  <Upload className="h-4 w-4" /> Upload photo
                </button>
                {hasCustomAvatar && (
                  <button
                    type="button"
                    onClick={remove}
                    disabled={busy}
                    className="inline-flex h-8 items-center rounded-md border border-tk-border px-3 text-sm font-medium text-tk-red hover:bg-tk-red-soft disabled:opacity-60 dark:border-tk-dark-border dark:text-[#fca5a5] dark:hover:bg-tk-red/10"
                  >
                    Remove photo
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

function MainSettings({
  profile,
  onSaved,
}: {
  profile: Profile;
  onSaved: (patch: Partial<Profile>) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // Email adalah username login: menggantinya wajib memakai password saat ini.
  const emailChanged = email.trim().toLowerCase() !== profile.email.toLowerCase();
  const dirty = name.trim() !== profile.name || emailChanged;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveProfile({ name: name.trim(), email: email.trim(), ...(emailChanged ? { currentPassword } : {}) });
      setCurrentPassword("");
      onSaved({ name: name.trim(), email: email.trim().toLowerCase() });
      notifyProfileUpdated();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Account details" description="Your name and the email you use to sign in.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="profile-name">Full name</Label>
          <input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} className={inputClass} />
        </div>
        <div>
          <Label htmlFor="profile-email">Email</Label>
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={100}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-tk-muted dark:text-tk-dark-muted">Changing your email also changes how you sign in.</p>
        </div>
        {emailChanged && (
          <PasswordField
            id="email-current-password"
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
            hint="Required to change the email you sign in with."
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1 block text-sm font-semibold">Role</span>
            <Badge tone={profile.role === "admin" ? "accent" : "neutral"}>{profile.role === "admin" ? "Admin" : "Staff"}</Badge>
          </div>
          <div>
            <span className="mb-1 block text-sm font-semibold">Team</span>
            <TeamBadge team={profile.team} />
          </div>
        </div>
        <p className="text-xs text-tk-muted dark:text-tk-dark-muted">Role and team are managed by an admin.</p>
        <PrimaryButton busy={busy} disabled={!dirty}>
          Save changes
        </PrimaryButton>
      </form>
    </Section>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          className={clsx(inputClass, "pr-9")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-tk-faint hover:text-tk-text dark:hover:text-tk-dark-text"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-tk-muted dark:text-tk-dark-muted">{hint}</p>}
    </div>
  );
}

function PasswordForm({ profile, onSaved, submitLabel }: { profile: Profile; onSaved: () => void; submitLabel: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const mismatch = confirm.length > 0 && next !== confirm;
  const context = { email: profile.email, name: profile.name };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = checkPassword(next, context);
    if (!check.ok) return toast.error(check.errors[0]);
    if (next !== confirm) return toast.error("New password and confirmation do not match");
    setBusy(true);
    try {
      await saveProfile({ currentPassword: current, newPassword: next, confirmPassword: confirm });
      setCurrent("");
      setNext("");
      setConfirm("");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <PasswordField id="current-password" label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
      <div>
        <PasswordField id="new-password" label="New password" value={next} onChange={setNext} autoComplete="new-password" />
        <PasswordStrength password={next} context={context} />
      </div>
      <div>
        <PasswordField id="confirm-password" label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        {mismatch && <p className="mt-1 text-xs text-tk-red dark:text-[#fca5a5]">Passwords do not match.</p>}
      </div>
      <PrimaryButton busy={busy}>{submitLabel}</PrimaryButton>
    </form>
  );
}

function PasswordSection({ profile }: { profile: Profile }) {
  return (
    <Section
      title="Password"
      description="Other devices are signed out after a change. Use a long passphrase you don't use anywhere else."
    >
      <PasswordForm profile={profile} submitLabel="Save password" onSaved={() => toast.success("Password updated")} />
    </Section>
  );
}

// Layar khusus saat user wajib membuat password sendiri sebelum bisa memakai aplikasi.
function RequiredPasswordChange({ profile }: { profile: Profile }) {
  const home = `/dashboard/${profile.role === "admin" ? "admin" : profile.team}`;
  return (
    <div className="flex min-h-full justify-center bg-tk-bg px-4 py-10 text-tk-text dark:bg-tk-dark-bg dark:text-tk-dark-text">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tk-accent-soft text-tk-accent dark:bg-tk-accent/15 dark:text-[#5eead4]">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Set a new password</h1>
            <p className="text-sm text-tk-muted dark:text-tk-dark-muted">Signed in as {profile.email}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-tk-muted dark:text-tk-dark-muted">
          Your password was set by an admin or no longer meets the password rules. Choose a new one that only you know to
          continue.
        </p>
        <div className="mt-5 rounded-lg border border-tk-border bg-tk-surface p-5 dark:border-tk-dark-border dark:bg-tk-dark-surface">
          <PasswordForm
            profile={profile}
            submitLabel="Set password and continue"
            onSaved={() => {
              toast.success("Password updated");
              // Muat ulang penuh supaya layout & sidebar memakai sesi baru.
              window.location.href = home;
            }}
          />
        </div>
      </div>
    </div>
  );
}
