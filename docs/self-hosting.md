# Self-hosting guide

How to run your own copy of Ticketing MS. For how to use the app once it runs, see the [user guide](user-guide.md).

## What you need

| | |
|---|---|
| **Node.js** | 20.9 or newer |
| **Database** | A [Neon](https://neon.tech) Postgres database. The app talks to it through Neon's serverless driver, so a plain Postgres server won't work without changing the driver. The free plan is enough for a small team. |
| **Image storage** | A [Cloudinary](https://cloudinary.com) account, for avatars and images in issues. The free plan is enough. |
| **Hosting** | [Vercel](https://vercel.com) is the easiest. Any host that runs a Node.js server works too. |

The build downloads fonts from Google Fonts, and the server calls `api.pwnedpasswords.com` to check new passwords against data breaches. If that call fails, the password is allowed.

## 1. Get the code

```bash
git clone https://github.com/Trias1/ticketing.git
cd ticketing
npm install
```

## 2. Configure

Copy the example file and fill it in:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon connection string. Use the pooled one (its host contains `-pooler`). |
| `JWT_SECRET` | Random string of at least 32 characters. The app won't start without it. |
| `CLOUDINARY_CLOUD_NAME` | From your Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From your Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From your Cloudinary dashboard |

Generate a `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
```

Never commit `.env.local`. It's already in `.gitignore`.

## 3. Create the database tables

```bash
npx drizzle-kit push
```

This creates every table from `db/schema.ts` in the database `DATABASE_URL` points at. Use this for a new database.

The SQL files in `drizzle/` are the history of the original deployment. You don't need them for a new database.

## 4. Create the first superadmin

The script creates a **superadmin** account. Superadmins manage every account and the security log but never see projects or issues; see [roles](user-guide.md#roles).

Pick your own long, unique password. It must follow the [password rules](user-guide.md#setting-your-own-password) and can't contain the word "admin".

```bash
SEED_ADMIN_EMAIL=you@yourcompany.com SEED_ADMIN_PASSWORD='your-own-passphrase' npx tsx scripts/seed-user.ts
```

On Windows PowerShell:

```powershell
$env:SEED_ADMIN_EMAIL="you@yourcompany.com"; $env:SEED_ADMIN_PASSWORD="your-own-passphrase"; npx tsx scripts/seed-user.ts
```

The script does nothing if the email already exists. Don't use an `@example.com` address: the superadmin dashboard flags those as leftover test accounts.

## 5. Run it

For development:

```bash
npm run dev
```

Open http://localhost:3000 and sign in with the superadmin account. Under **New user**, create an **admin** for each team; admins then create the users of their own team.

## Deploying

### Vercel

1. Push your copy to GitHub and import it in Vercel.
2. In **Settings → Environment Variables**, add the five variables from step 2.
3. Deploy. Every push to your main branch deploys again.

If you add Neon from Vercel's **Storage** tab, Vercel sets `DATABASE_URL` for you. You still need to add the other four.

### Your own server

```bash
npm run build
npm run start
```

`npm run start` serves on port 3000. Put a reverse proxy with HTTPS in front of it:

- **Serve it over HTTPS.** The app always sends `Strict-Transport-Security`, and session cookies are marked `Secure` in production, so plain HTTP won't keep you signed in.
- **Set the `X-Real-IP` header** to the client's address. Rate limits and the sign-in log rely on it. For Nginx: `proxy_set_header X-Real-IP $remote_addr;`. Without it, all visitors share one rate limit.

## Health check

| Endpoint | Use it for |
|---|---|
| `GET /api/health` | Uptime monitors. Returns `{"ok":true}` without touching the database, so checking every minute doesn't stop Neon from suspending when idle. |
| `GET /api/health?deep=1` | Manual checks. Also queries the database and returns `503` when it's down. Limited to 6 requests per minute per IP. |

## Upgrading

1. **Back up the database first.** In Neon, create a branch from your main branch; it's an instant copy you can go back to.
2. Pull the new code and install:

   ```bash
   git pull
   npm install
   ```

3. Apply schema changes:

   ```bash
   npx drizzle-kit push
   ```

   Read what it says it will change before you confirm. If it wants to drop a column or table that holds data, stop and check the release notes.

4. Build and restart, or push to deploy on Vercel.

### Upgrading to three roles (superadmin, admin, user)

Installs from before this change have two roles, `admin` and `staff`. Run [`drizzle/0023_three_roles.sql`](../drizzle/0023_three_roles.sql) in the Neon SQL editor, as one transaction, right when you deploy the new code. It turns every `admin` into a `superadmin` and every `staff` into a `user`, and signs everyone out once, because their old sessions carry the old role. Try it on a Neon branch first.

## Known limitations

- **Teams are fixed to Cloud, DevOps and PM.** Adding or renaming a team needs code changes:
  - `lib/team-access.ts` (`PROJECT_TEAMS`): the list used for access checks, account management and the dashboard
  - `components/register/RegisterUserForm.tsx` (`WORK_TEAMS`): team names and hints in the New user form
  - `components/ui/kit.tsx` and `components/admin/AdminOverview.tsx`: team labels and colors
- **Neon only.** The database driver is `@neondatabase/serverless` over HTTP.
- **Cloudinary only** for uploads. Using another image host means changing the upload routes, the `img-src` rule of the Content Security Policy in `next.config.js`, and the allowed avatar URLs in `app/api/profileusers/route.ts`.
- **No self sign-up and no email.** Superadmins and team admins create accounts and reset passwords; nothing is sent by email.
- **Images in Markdown must be uploaded.** The Content Security Policy blocks images from other websites.

## Links on the home page

The home page links to this repository. If you publish your own fork, change `REPO_URL` in `lib/site.ts`.
