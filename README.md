# Ticketing MS

A self-hosted ticketing workspace for small teams. Users run their work in projects with issues, a board and a calendar; team admins look after their team's accounts; one superadmin, the owner, looks after every account and the security log without ever seeing a team's projects.

**Live:** [ticketing.west-solutions.web.id](https://ticketing.west-solutions.web.id) · **License:** [MIT](LICENSE)

## Documentation

- [User guide](docs/user-guide.md): roles, accounts, projects, issues, board and calendar, and the account pages
- [Self-hosting guide](docs/self-hosting.md): setup, deploying, upgrading and known limitations
- [Security](docs/security.md): how sessions, rate limits and passwords work
- [Contributing](CONTRIBUTING.md) and [reporting a vulnerability](SECURITY.md)

---

## What's inside

### Three roles

| Role | Does |
|---|---|
| **User** | Works on issues in the projects they belong to |
| **Admin** | Works in projects too, and creates, resets and deactivates the user accounts of their own team. Created by the superadmin |
| **Superadmin** | The owner; there is only one. Creates team admins, manages every account, role and team, and watches the security log. Never sees projects or issues |

### For users and admins
- **Projects you belong to.** Switch between them from the sidebar or jump anywhere with <kbd>Ctrl</kbd> + <kbd>K</kbd>. One person can be in many projects; star the ones you use most.
- **Issues in three views.** A filterable list, a drag-and-drop board with your own columns, and a calendar by due date.
- **Issue details that hold real work.** Markdown descriptions with pasted images, task checklists, labels, an assignee, a due date, comments and a full activity history. Issues close and reopen instead of disappearing.
- **My issues and a dashboard.** What's assigned to you, what you opened, what's overdue and what's due this week, across every project.
- **Project settings for owners.** Members and roles, labels with colors, board columns, and the project's name, icon and color.

### For the superadmin
- **Accounts.** Create team admins, switch accounts between admin and user, change teams, deactivate, or reset a password with a one-time temporary password.
- **Security overview.** Dormant and never-used accounts, extra superadmin accounts, and a sign-in log showing successful, failed and blocked sign-ins with IP address and device.
- The superadmin doesn't take part in projects: people, not tickets.

## Security

Security was treated as a feature, not an afterthought:

- Short-lived access tokens (15 minutes) with **rotating refresh tokens**. Only a SHA-256 hash of each refresh token is stored, and reusing an old one revokes the whole session.
- Every session can be revoked: changing or resetting a password, changing a role, or deactivating an account signs the user out everywhere.
- **Brute-force protection** that holds under parallel requests: attempts are counted atomically per email and per IP before the password is checked.
- **Rate limits** on every write request per IP, and per user for uploads, comments, issues, projects and search.
- **Password rules** shared by server and forms (length, variety, common and personal passwords rejected), a check against known data breaches via Have I Been Pwned (k-anonymity), and a forced password change for accounts created or reset by someone else.
- Member-only project access (other projects return 404), sanitized Markdown, CSRF origin checks, and strict security headers (CSP, HSTS, frame denial).

The details, including how to run the migrations, are in [`docs/security.md`](docs/security.md).

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL on Neon, Drizzle ORM |
| Uploads | Cloudinary |
| Hosting | Vercel |

## Getting started

**Requirements:** Node.js 20.9 or newer, a [Neon](https://neon.tech) Postgres database (the app uses Neon's serverless driver; the free plan is enough), and a Cloudinary account for image uploads.

```bash
git clone https://github.com/Trias1/ticketing.git
cd ticketing
npm install
```

Copy `.env.example` to `.env.local` and fill it in:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `JWT_SECRET` | Random string, at least 32 characters |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

Generate a `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
```

Set up the database and the first superadmin. Replace `...` with your own long, unique passphrase:

```bash
npx drizzle-kit push
SEED_ADMIN_EMAIL=you@yourcompany.com SEED_ADMIN_PASSWORD=... npx tsx scripts/seed-user.ts
```

Then start the app:

```bash
npm run dev
```

Open http://localhost:3000 and sign in with the superadmin account you just created.

> `.env*` files (except `.env.example`) are ignored by git and by Vercel uploads. Never commit real credentials.

Deploying to Vercel or your own server, upgrading, and the current limitations (such as the fixed Cloud, DevOps and PM teams) are covered in the [self-hosting guide](docs/self-hosting.md).

## Health check

For uptime monitors:

| Endpoint | What it does |
|---|---|
| `GET /api/health` | Returns `{"ok":true}` without touching the database. Point your monitor here, so a check every minute doesn't keep a serverless database (such as Neon) from suspending. |
| `GET /api/health?deep=1` | Also runs a database query and returns `503` when the database is down. Limited to 6 requests per minute per IP; use it for manual checks, not for monitors. |

## Project structure

```
proxy.ts        Runs before dashboard pages and API routes: sign-in check, CSRF, write rate limits
app/            Pages and API routes (App Router)
components/     UI: superadmin console, project workspace, shared kit
db/             Drizzle schema and database client
drizzle/        SQL migrations
lib/            Auth, sessions, rate limits, access control, queries
docs/           User guide, self-hosting guide, design notes and security documentation
scripts/        One-off scripts (first superadmin)
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint with ESLint |

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to set up, check and submit a change.

If you find a security problem, please report it privately as described in [SECURITY.md](SECURITY.md) instead of opening a public issue.

## License

[MIT](LICENSE) © 2026 Trias Zaen Mutaqin
