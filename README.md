# Ticketing MS

A self-hosted ticketing workspace for small teams. Admins look after people and account security; staff run their work in projects with issues, a board and a calendar.

**Live:** [ticketing.west-solutions.web.id](https://ticketing.west-solutions.web.id) · **License:** [MIT](LICENSE)

---

## What's inside

### For staff
- **Projects you belong to.** Switch between them from the sidebar or jump anywhere with <kbd>Ctrl</kbd> + <kbd>K</kbd>. One person can be in many projects; star the ones you use most.
- **Issues in three views.** A filterable list, a drag-and-drop board with your own columns, and a calendar by due date.
- **Issue details that hold real work.** Markdown descriptions with pasted images, task checklists, labels, an assignee, a due date, comments and a full activity history. Issues close and reopen instead of disappearing.
- **My issues and a dashboard.** What's assigned to you, what you opened, what's overdue and what's due this week, across every project.
- **Project settings for owners.** Members and roles, labels with colors, board columns, and the project's name, icon and color.

### For admins
- **Members.** Create accounts, change role and team, deactivate, or reset a password with a one-time temporary password.
- **Security overview.** Dormant and never-used accounts, admin accounts, and a sign-in log showing successful, failed and blocked sign-ins with IP address and device.
- Admins don't take part in projects. They manage people, not tickets.

## Security

Security was treated as a feature, not an afterthought:

- Short-lived access tokens (15 minutes) with **rotating refresh tokens**. Only a SHA-256 hash of each refresh token is stored, and reusing an old one revokes the whole session.
- Every session can be revoked: changing or resetting a password, changing a role, or deactivating an account signs the user out everywhere.
- **Brute-force protection** that holds under parallel requests: attempts are counted atomically per email and per IP before the password is checked.
- **Rate limits** on every write request per IP, and per user for uploads, comments, issues, projects and search.
- **Password rules** shared by server and forms (length, variety, common and personal passwords rejected), a check against known data breaches via Have I Been Pwned (k-anonymity), and a forced password change for accounts created or reset by an admin.
- Member-only project access (other projects return 404), sanitized Markdown, CSRF origin checks, and strict security headers (CSP, HSTS, frame denial).

The details, including how to run the migrations, are in [`docs/security.md`](docs/security.md).

## Tech stack

| | |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL on Neon, Drizzle ORM |
| Uploads | Cloudinary |
| Hosting | Vercel |

## Getting started

**Requirements:** Node.js 20 or newer, a Postgres database (Neon works out of the box), and a Cloudinary account for image uploads.

```bash
git clone https://github.com/Trias1/ticketing.git
cd ticketing
npm install
```

Create `.env.local`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Random string, at least 32 characters |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

Generate a `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
```

Set up the database and the first admin. Replace `...` with your own long, unique passphrase:

```bash
npx drizzle-kit push
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD=... npx tsx scripts/seed-user.ts
```

Then start the app:

```bash
npm run dev
```

Open http://localhost:3000 and sign in with the admin account you just created.

> `.env*` files are ignored by git and by Vercel uploads. Never commit real credentials.

## Project structure

```
app/            Pages and API routes (App Router)
components/     UI: admin, staff workspace, shared kit
db/             Drizzle schema and database client
drizzle/        SQL migrations
lib/            Auth, sessions, rate limits, access control, queries
docs/           Design notes and security documentation
scripts/        One-off scripts (first admin)
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint with ESLint |

## Contributing

Issues and pull requests are welcome. Please keep changes focused, run `npm run lint` and `npx tsc --noEmit` before opening a PR, and never include credentials or real user data.

If you find a security problem, please report it privately instead of opening a public issue.

## License

[MIT](LICENSE) © 2026 Trias Zaen Mutaqin
