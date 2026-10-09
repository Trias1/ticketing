import { neon } from "@neondatabase/serverless";
import { and, eq, isNull, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { refreshTokens, users } from "db/schema";
import { jwtSecret } from "lib/jwt-secret";
import { logAuthEvent } from "lib/audit";

// Sesi = access token (JWT 15 menit) + refresh token (acak, disimpan sebagai hash, dirotasi).
// Modul ini dipakai middleware (Edge) dan route API (Node), jadi hanya memakai Web Crypto,
// jose, dan driver HTTP Neon; jangan impor next/headers atau db/index (memakai fs) di sini.

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";
const LEGACY_COOKIE = "token";

export const ACCESS_TTL = 15 * 60; // 15 menit
const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 hari sejak terakhir dipakai
const ABSOLUTE_TTL = 30 * 24 * 60 * 60; // maksimal 30 hari sejak login
// Beberapa request bisa me-refresh bersamaan (tab lain, prefetch). Token yang baru saja dirotasi
// masih diterima sebentar; setelah itu memakainya lagi dianggap pencurian.
const REUSE_GRACE_MS = 30_000;

let client: ReturnType<typeof createClient> | null = null;
function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return drizzle(neon(url));
}
const db = () => (client ??= createClient());

export type SessionUser = {
  id: string;
  role: string;
  team: string;
  sessionVersion: number;
  mustChangePassword: boolean;
};

export type SessionMeta = { userAgent?: string | null; ip?: string | null };

// pwc = "password change required": selama true, user hanya boleh ke halaman ganti password.
export type AccessClaims = JWTPayload & { role: string; team: string; ver: number; pwc?: boolean; typ: "access" };

type CookieOptions = {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
};

// Cocok dengan `cookies()` dari next/headers maupun `response.cookies` di middleware.
export type CookieJar = { set(name: string, value: string, options: CookieOptions): unknown };

const cookieOptions = (maxAge: number): CookieOptions => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

// ---------- Access token ----------

export async function createAccessToken(user: SessionUser) {
  return new SignJWT({
    role: user.role,
    team: user.team,
    ver: user.sessionVersion,
    ...(user.mustChangePassword ? { pwc: true } : {}),
    typ: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL}s`)
    .sign(jwtSecret());
}

export async function verifyAccessToken(token: string | undefined): Promise<AccessClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), { algorithms: ["HS256"] });
    if (payload.typ !== "access" || typeof payload.sub !== "string") return null;
    return payload as AccessClaims;
  } catch {
    return null;
  }
}

// ---------- Refresh token ----------

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

const secondsUntil = (date: Date) => Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000));

// Buat sesi baru (login) atau token berikutnya dalam family yang sama (refresh).
export async function issueSession(
  jar: CookieJar,
  user: SessionUser,
  meta: SessionMeta,
  family?: { id: string; absoluteExpiresAt: Date },
  tokenId?: string
) {
  const now = Date.now();
  const familyId = family?.id ?? crypto.randomUUID();
  const absoluteExpiresAt = family?.absoluteExpiresAt ?? new Date(now + ABSOLUTE_TTL * 1000);
  const expiresAt = new Date(Math.min(now + REFRESH_TTL * 1000, absoluteExpiresAt.getTime()));
  const raw = randomToken();

  const [row] = await db()
    .insert(refreshTokens)
    .values({
      ...(tokenId ? { id: tokenId } : {}),
      userId: user.id,
      sessionVersion: user.sessionVersion,
      familyId,
      tokenHash: await sha256(raw),
      expiresAt,
      absoluteExpiresAt,
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
      ip: meta.ip?.slice(0, 64) ?? null,
    })
    .returning({ id: refreshTokens.id });

  const accessToken = await createAccessToken(user);
  jar.set(ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_TTL));
  jar.set(REFRESH_COOKIE, raw, cookieOptions(secondsUntil(expiresAt)));
  jar.set(LEGACY_COOKIE, "", cookieOptions(0));

  // Sesekali bersihkan token yang sudah lama kedaluwarsa.
  if (Math.random() < 0.05) {
    await db()
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, new Date(now - 24 * 60 * 60 * 1000)));
  }

  return { id: row.id, accessToken };
}

export type RotateResult = { ok: true; user: SessionUser; accessToken: string } | { ok: false };

// Tukar refresh token dengan pasangan token baru. Token yang dipakai ulang di luar masa
// toleransi berarti bocor: seluruh family dicabut sehingga pencuri & korban sama-sama keluar.
// Apakah rantai pengganti sebuah token masih hidup (belum dicabut lewat logout/admin).
// Pengganti yang belum ada di database berarti masih sedang dibuat oleh request lain: dianggap hidup.
async function chainAlive(replacementId: string, now: number) {
  let id: string | null = replacementId;
  for (let hop = 0; id && hop < 5; hop++) {
    const [row] = await db()
      .select({ revokedAt: refreshTokens.revokedAt, replacedBy: refreshTokens.replacedBy })
      .from(refreshTokens)
      .where(eq(refreshTokens.id, id))
      .limit(1);
    if (!row) return true;
    if (!row.revokedAt) return true;
    if (!row.replacedBy || now - row.revokedAt.getTime() > REUSE_GRACE_MS) return false;
    id = row.replacedBy;
  }
  return false;
}

// Tukar refresh token dengan pasangan token baru.
// - Klaim atomik: revokedAt dan replacedBy diisi dalam satu UPDATE, jadi request paralel tidak pernah
//   melihat token "dicabut tanpa pengganti".
// - Token yang baru saja dirotasi masih diterima REUSE_GRACE_MS (tab lain/prefetch), selama rantai
//   penggantinya belum dicabut. Di luar itu, pemakaian ulang = pencurian: seluruh family dicabut.
// - Token dari sesi lama (session_version berbeda: password/role/status berubah) selalu ditolak.
export async function rotateSession(
  jar: CookieJar,
  raw: string | undefined,
  meta: SessionMeta,
  attempt = 0
): Promise<RotateResult> {
  if (!raw || raw.length > 128) return { ok: false };

  const [token] = await db()
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, await sha256(raw)))
    .limit(1);
  if (!token) return { ok: false };

  const now = Date.now();
  if (token.expiresAt.getTime() <= now || token.absoluteExpiresAt.getTime() <= now) return { ok: false };

  const [user] = await db()
    .select({
      id: users.id,
      role: users.role,
      team: users.team,
      isActive: users.isActive,
      sessionVersion: users.sessionVersion,
      mustChangePassword: users.mustChangePassword,
    })
    .from(users)
    .where(eq(users.id, token.userId))
    .limit(1);
  if (!user || user.isActive === false || token.sessionVersion !== user.sessionVersion) {
    await revokeFamily(token.familyId);
    return { ok: false };
  }

  const family = { id: token.familyId, absoluteExpiresAt: token.absoluteExpiresAt };

  if (token.revokedAt) {
    // Dicabut tanpa pengganti = logout/admin: tolak saja (family-nya memang sudah dicabut).
    if (!token.replacedBy) return { ok: false };
    const withinGrace = now - token.revokedAt.getTime() <= REUSE_GRACE_MS;
    if (!withinGrace || !(await chainAlive(token.replacedBy, now))) {
      // Token lama dipakai lagi: kemungkinan dicuri. Cabut seluruh family & catat untuk admin.
      await revokeFamily(token.familyId);
      await logAuthEvent({ type: "token_reuse", userId: user.id, ip: meta.ip, userAgent: meta.userAgent });
      return { ok: false };
    }
    const sibling = await issueSession(jar, user, meta, family);
    return { ok: true, user, accessToken: sibling.accessToken };
  }

  const nextId = crypto.randomUUID();
  const claimed = await db()
    .update(refreshTokens)
    .set({ revokedAt: new Date(now), replacedBy: nextId })
    .where(and(eq(refreshTokens.id, token.id), isNull(refreshTokens.revokedAt)))
    .returning({ id: refreshTokens.id });
  if (!claimed.length) {
    // Request lain mengklaim lebih dulu: ulangi sekali lewat jalur masa toleransi.
    return attempt === 0 ? rotateSession(jar, raw, meta, 1) : { ok: false };
  }

  const next = await issueSession(jar, user, meta, family, nextId);
  return { ok: true, user, accessToken: next.accessToken };
}

export async function revokeFamily(familyId: string) {
  await db()
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
}

// Logout: cabut sesi milik refresh token ini (perangkat ini saja).
export async function revokeByToken(raw: string | undefined) {
  if (!raw || raw.length > 128) return;
  const [token] = await db()
    .select({ familyId: refreshTokens.familyId })
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, await sha256(raw)))
    .limit(1);
  if (token) await revokeFamily(token.familyId);
}

// Cabut semua sesi user (password/role/status berubah).
export async function revokeAllSessions(userId: string) {
  await db()
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}

export function clearSessionCookies(jar: CookieJar) {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, LEGACY_COOKIE]) jar.set(name, "", cookieOptions(0));
}
