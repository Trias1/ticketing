# ticketing

Ticketing MS — an internal ticketing app. Admins manage members and account security; staff work in projects with issues, a board, a calendar, comments, labels and members.

Live: https://ticketing.west-solutions.web.id

## Stack

- Next.js 15 (App Router) + React 19
- Tailwind CSS 4
- Drizzle ORM on Neon Postgres
- Cloudinary for image uploads
- Deployed on Vercel

## Getting started

```bash
npm install
npm run dev
```

Create `.env.local` with:

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `JWT_SECRET` | Random string, at least 32 characters (see below) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary account for uploads |

Generate a `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
```

Never commit `.env*` files; they are ignored by git and by Vercel uploads (`.vercelignore`).

## Database

Schema lives in `db/schema.ts`; SQL migrations are in `drizzle/`. The production database was managed with `drizzle-kit push`, so newer migrations (`0018`–`0022`) are applied by hand, in order. See `docs/design/staff-workspace.md` and `docs/security.md`.

First admin account (credentials come from the environment, nothing is hard-coded). Replace `...` with your own long, unique passphrase:

```bash
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD=... npx tsx scripts/seed-user.ts
```

## Security

Sessions (short-lived JWT + rotating refresh tokens), brute-force limits, password rules, forced password change, rate limits and the admin sign-in log are described in [`docs/security.md`](docs/security.md).
