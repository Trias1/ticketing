# Security notes

## Sign-in protection

- **Brute force:** `/api/login` allows 5 failed attempts per email and 30 per IP in 15 minutes, then locks that key for 15 minutes (HTTP 429 with `Retry-After`). The "current password" check in Profile has its own limit of 5 per user. Counters live in the `login_attempts` table, so they work across serverless instances. To unlock someone early, delete their row: `DELETE FROM login_attempts WHERE key = 'login:email:<email>';`
- **Email enumeration:** an unknown email takes the same bcrypt time as a wrong password, and both return the same message.

## Passwords

- **Rules** (`lib/password-policy.ts`, shared by the server and the forms): 10–128 characters; at least 3 of lowercase/uppercase/number/symbol, or 16+ characters (passphrase); not a common password (also catches variants like `Admin2024!`) or a simple pattern (`aaaa…`, `123456…`, `qwerty…`); must not contain the user's name or email. The forms show a strength meter with the same rules.
- **Breached passwords:** new passwords are checked against Have I Been Pwned (`lib/pwned.ts`) using k-anonymity: only the first 5 characters of the SHA-1 hash leave the server. If the service can't be reached, the check is skipped instead of blocking the user.
- **Forced change** (`users.must_change_password`): set when an admin creates an account or resets a password, and at sign-in when the password the user typed no longer meets the rules. While it's set, every page redirects to the user's profile, which shows only the "Set a new password" form, and APIs answer `403 password_change_required`. The new password must differ from the old one; saving it clears the flag, signs out other devices, and starts a fresh session.
- **Hashing:** bcrypt cost 12. Older hashes (cost 10) are re-hashed at the next successful sign-in.
- **First admin:** `SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… npx tsx scripts/seed-user.ts` (the password must pass the rules; nothing is hard-coded).

## Sessions (access + refresh tokens)

| | Access token | Refresh token |
|---|---|---|
| What | JWT (HS256), claims `sub`, `role`, `team`, `ver`, `typ: "access"` | 256-bit random string (not a JWT) |
| Cookie | `access_token`, HttpOnly, SameSite=Lax, Secure in production | `refresh_token`, same flags |
| Lifetime | 15 minutes | 7 days since last use, 30 days max since sign-in |
| Stored server-side | No (checked against `users.session_version` on every request) | SHA-256 hash only, in `refresh_tokens` |

Code: `lib/session.ts` (issue, rotate, revoke; Edge-safe so the middleware can use it), `lib/auth.ts` (`getCurrentUser`, `revokeSessions`).

**Flow**

1. `POST /api/login` checks the password and starts a session: one refresh-token *family* per sign-in.
2. Page requests: `middleware.ts` verifies the access token. If it has expired but a refresh token is present, the middleware rotates it before the page renders, so the user never sees it.
3. API requests from the browser: `components/AuthFetch.tsx` wraps `fetch`. On a `401` from `/api/*` it calls `POST /api/auth/refresh` once (shared by all requests that failed at the same time) and retries. If the refresh fails it sends the user to `/login`.
4. `POST /api/logout` revokes the device's family in the database and clears the cookies, so a copied cookie stops working too.

**Rotation and theft detection:** every refresh revokes the old token and issues a new one in the same family. A token that was already rotated is still accepted for 30 seconds (parallel requests, other tabs); used again after that, it means the token leaked, and the whole family is revoked, which signs out both the attacker and the user.

**Revoking everything for a user:** `revokeSessions(userId)` bumps `session_version` (access tokens stop working at once) and revokes all refresh tokens. It runs when an admin resets a password, the user changes their own password (other devices are signed out; the current one gets a new session), an account is deactivated, or a role/team changes.

**Status codes:** `401` means "not signed in / session expired" and is the only status that triggers a refresh. Signed-in users without permission get `403`; validation errors (including a wrong current password) get `400`.

`JWT_SECRET` must be at least 32 characters; the app refuses to sign or verify tokens otherwise. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
```

Changing it does not sign people out: old access tokens fail, and the browser quietly gets new ones from its refresh token (refresh tokens don't depend on the secret). To sign everyone out, revoke all refresh tokens:

```sql
UPDATE refresh_tokens SET revoked_at = now() WHERE revoked_at IS NULL;
```

## Deploying these changes

1. Run `drizzle/0019_auth_hardening.sql` (adds `users.session_version` and `login_attempts`), `drizzle/0020_refresh_tokens.sql` (adds `refresh_tokens`) and `drizzle/0021_must_change_password.sql` (adds `users.must_change_password`) on the database. All three only add things. Production (Neon) already ran them (0019–0020 on 2026-10-08, 0021 on 2026-10-09).
2. Set a new random `JWT_SECRET` (as above) in the hosting environment. The old one was too short to be safe.

## Headers

`next.config.js` sends a Content-Security-Policy (scripts and connections only to this origin, images from https), HSTS, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy, and a permissions policy. Uploads are limited to JPG/PNG/WEBP and Cloudinary re-checks the file content.
