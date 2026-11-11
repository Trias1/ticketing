// Mode demo publik. Aktif hanya kalau NEXT_PUBLIC_DEMO_MODE=1 (dipakai di project Vercel demo
// dengan database Neon sendiri). Instance biasa tidak pernah menyalakannya.
// Modul ini murni (tanpa db), jadi aman dipakai di client, server, dan proxy.

export const isDemo = () => process.env.NEXT_PUBLIC_DEMO_MODE === "1";

export const DEMO_EMAIL_DOMAIN = "demo.test";

// Akun yang bisa dimasuki sekali klik dari halaman login demo.
export const DEMO_LOGINS = [
  {
    key: "superadmin",
    email: `superadmin@${DEMO_EMAIL_DOMAIN}`,
    label: "Superadmin",
    description: "Sees every account and team, never projects or issues.",
  },
  {
    key: "admin",
    email: `admin@${DEMO_EMAIL_DOMAIN}`,
    label: "Team admin",
    description: "Runs the Platform team: projects, issues and team members.",
  },
  {
    key: "user",
    email: `user@${DEMO_EMAIL_DOMAIN}`,
    label: "User",
    description: "Works on issues in the projects they belong to.",
  },
] as const;

export type DemoLoginKey = (typeof DEMO_LOGINS)[number]["key"];

export const demoLogin = (key: unknown) => DEMO_LOGINS.find((d) => d.key === key) ?? null;

// Akun bawaan demo dilindungi supaya pengunjung lain tetap bisa masuk: tidak bisa dinonaktifkan,
// diganti role/tim, direset password-nya, atau diganti email/password-nya.
export const isProtectedDemoAccount = (email: string | null | undefined) =>
  isDemo() && !!email && email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);

export const DEMO_LOCKED_MESSAGE = "This is disabled for the built-in demo accounts. Data resets every day.";
export const DEMO_UPLOAD_MESSAGE = "Image uploads are turned off in the demo.";
