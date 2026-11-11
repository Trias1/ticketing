import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "components/ui/kit";
import ThemeToggle from "components/ui/ThemeToggle";
import BoardDemo from "components/home/BoardDemo";
import { DEMO_URL, REPO_URL, docsUrl } from "lib/site";
import { isDemo } from "lib/demo";

export const metadata: Metadata = {
  title: "Ticketing MS: issue tracking for small teams",
  description:
    "Open-source, self-hosted ticketing for small teams: projects, issues, a board and a calendar, with hardened sign-in and account security.",
};

const STAFF_FEATURES = [
  {
    title: "Projects you belong to",
    body: "Switch from the sidebar or jump anywhere with Ctrl + K. Star the projects you open most.",
  },
  {
    title: "Three views of the same issues",
    body: "A filterable list, a board with your own columns, and a calendar by due date.",
  },
  {
    title: "Issues that hold the real work",
    body: "Markdown with pasted images, task checklists, labels, an assignee, a due date, comments and a full history.",
  },
  {
    title: "Your own dashboard",
    body: "What's assigned to you, what's overdue and what's due this week, across every project.",
  },
];

const ADMIN_FEATURES = [
  {
    title: "Team admins",
    body: "Each team's admin creates the team's user accounts, resets their passwords and deactivates them, and works in projects like everyone else.",
  },
  {
    title: "One superadmin",
    body: "The owner creates teams and their admins, renames teams, and sees every account, with dormant-account checks and a sign-in log with IP address and device. Never sees projects or issues.",
  },
];

const SECURITY = [
  "Sessions use 15-minute access tokens and rotating refresh tokens. Reusing an old one signs that session out.",
  "Changing a password or a role, or deactivating an account, signs the user out everywhere.",
  "Sign-in attempts are limited per email and per IP, and every write request is rate limited.",
  "Passwords are checked against known data breaches before they're accepted.",
  "People only see the projects they're members of. Markdown is sanitized and strict security headers are on.",
];

const SETUP = [
  { text: "Clone the repository and install dependencies.", code: `git clone ${REPO_URL}.git\ncd ticketing\nnpm install` },
  { text: "Copy .env.example to .env.local and fill in your Neon URL, a JWT secret and Cloudinary keys.", code: "cp .env.example .env.local" },
  {
    text: "Create the tables and the first superadmin account.",
    code: "npx drizzle-kit push\nSEED_ADMIN_EMAIL=you@yourcompany.com SEED_ADMIN_PASSWORD=... npx tsx scripts/seed-user.ts",
  },
  { text: "Start the app and sign in.", code: "npm run dev" },
];

const navLink =
  "rounded-md px-2.5 py-1.5 text-sm text-tk-muted hover:bg-tk-subtle hover:text-tk-text focus:outline-hidden focus-visible:ring-2 focus-visible:ring-tk-accent/40 dark:text-tk-dark-muted dark:hover:bg-tk-dark-subtle dark:hover:text-tk-dark-text";
const primaryButton =
  "inline-flex h-10 items-center rounded-md bg-tk-accent px-4 text-sm font-medium text-white hover:bg-tk-accent-hover focus:outline-hidden focus-visible:ring-2 focus-visible:ring-tk-accent/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-tk-dark-bg";
const secondaryButton =
  "inline-flex h-10 items-center rounded-md border border-tk-border bg-tk-surface px-4 text-sm font-medium hover:bg-tk-subtle focus:outline-hidden focus-visible:ring-2 focus-visible:ring-tk-accent/40 dark:border-tk-dark-border dark:bg-tk-dark-surface dark:hover:bg-tk-dark-subtle";
const sectionHeading = "text-xl font-semibold tracking-tight";
const muted = "text-tk-muted dark:text-tk-dark-muted";

function FeatureList({ items }: { items: { title: string; body: string }[] }) {
  return (
    <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
      {items.map((f) => (
        <div key={f.title} className="border-l-2 border-tk-accent/60 pl-4">
          <dt className="font-semibold">{f.title}</dt>
          <dd className={`mt-1 text-sm leading-relaxed ${muted}`}>{f.body}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-tk-bg text-tk-text dark:bg-tk-dark-bg dark:text-tk-dark-text">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <BrandMark size={28} />
          Ticketing MS
        </Link>
        <nav className="flex items-center gap-1">
          <a href={docsUrl("user-guide.md")} className={`${navLink} hidden sm:inline-flex`}>
            Docs
          </a>
          <a href={REPO_URL} className={`${navLink} hidden sm:inline-flex`}>
            GitHub
          </a>
          <ThemeToggle />
          <Link href="/login" className={`${primaryButton} ml-1 h-9`}>
            Sign in
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 sm:pt-16">
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            Issue tracking for small teams, on a server you control.
          </h1>
          <p className={`mt-5 max-w-2xl text-lg leading-relaxed ${muted}`}>
            Projects, issues, a board and a calendar for the people doing the work. Member management and sign-in
            security for the people looking after them. Open source under the MIT license.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {isDemo() ? (
              <Link href="/login" className={primaryButton}>
                Try the demo
              </Link>
            ) : (
              <>
                <Link href="/login" className={primaryButton}>
                  Sign in
                </Link>
                {DEMO_URL && (
                  <a href={DEMO_URL} className={secondaryButton}>
                    Try the live demo
                  </a>
                )}
              </>
            )}
            <a href={docsUrl("self-hosting.md")} className={secondaryButton}>
              Host your own
            </a>
          </div>

          <div className="mt-12 rounded-xl border border-tk-border bg-tk-surface p-3 sm:p-4 dark:border-tk-dark-border dark:bg-tk-dark-surface">
            <BoardDemo />
          </div>
        </section>

        <section className="border-t border-tk-border dark:border-tk-dark-border">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[16rem_1fr]">
            <div>
              <h2 className={sectionHeading}>For the people doing the work</h2>
              <p className={`mt-2 text-sm leading-relaxed ${muted}`}>Everything for working through issues together.</p>
            </div>
            <FeatureList items={STAFF_FEATURES} />
          </div>
        </section>

        <section className="border-t border-tk-border dark:border-tk-dark-border">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[16rem_1fr]">
            <div>
              <h2 className={sectionHeading}>Accounts and roles</h2>
              <p className={`mt-2 text-sm leading-relaxed ${muted}`}>
                No self sign-up: accounts are created from the top down, so a team only sees its own work.
              </p>
            </div>
            <FeatureList items={ADMIN_FEATURES} />
          </div>
        </section>

        <section className="border-t border-tk-border dark:border-tk-dark-border">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[16rem_1fr]">
            <div>
              <h2 className={sectionHeading}>Security built in</h2>
              <p className={`mt-2 text-sm leading-relaxed ${muted}`}>
                The details are in{" "}
                <a href={docsUrl("security.md")} className="font-medium text-tk-accent hover:underline dark:text-[#5eead4]">
                  docs/security.md
                </a>
                .
              </p>
            </div>
            <ul className="max-w-2xl space-y-3 text-sm leading-relaxed">
              {SECURITY.map((s) => (
                <li key={s} className="flex gap-3">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-tk-accent" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-tk-border dark:border-tk-dark-border">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[16rem_1fr]">
            <div>
              <h2 className={sectionHeading}>Host your own</h2>
              <p className={`mt-2 text-sm leading-relaxed ${muted}`}>
                You need Node.js 20.9 or newer, a Neon Postgres database (the free plan is enough) and a Cloudinary account. The{" "}
                <a href={docsUrl("self-hosting.md")} className="font-medium text-tk-accent hover:underline dark:text-[#5eead4]">
                  self-hosting guide
                </a>{" "}
                covers deploying and upgrading.
              </p>
            </div>
            <ol className="min-w-0 space-y-5">
              {SETUP.map((step, i) => (
                <li key={step.text} className="flex min-w-0 gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tk-accent-soft text-sm font-semibold text-tk-accent dark:bg-tk-accent/20 dark:text-[#5eead4]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="pt-0.5 text-sm">{step.text}</p>
                    <pre className="mt-2 overflow-x-auto rounded-md bg-tk-subtle px-3 py-2.5 font-mono text-[13px] leading-relaxed dark:bg-tk-dark-subtle">
                      <code>{step.code}</code>
                    </pre>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-tk-border dark:border-tk-dark-border">
        <div className={`mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm sm:px-6 ${muted}`}>
          <span>Ticketing MS is open source under the MIT license.</span>
          <div className="flex gap-4">
            <a href={docsUrl("user-guide.md")} className="hover:text-tk-text dark:hover:text-tk-dark-text">
              User guide
            </a>
            <a href={docsUrl("self-hosting.md")} className="hover:text-tk-text dark:hover:text-tk-dark-text">
              Self-hosting
            </a>
            <a href={REPO_URL} className="hover:text-tk-text dark:hover:text-tk-dark-text">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
