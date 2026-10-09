import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

// Pembatas request berbasis database (tabel login_attempts), supaya berlaku di semua instance
// serverless. Modul ini Edge-safe (dipakai juga oleh middleware): hanya driver HTTP Neon.
//
// Setiap kunci ("login:email:x", "api:ip:y", ...) punya penghitung dalam satu jendela waktu.
// Percobaan DIHITUNG DULU secara atomik sebelum pekerjaan mahal (cek password, upload), jadi
// request paralel tidak bisa lolos bersamaan melewati batas.

export type Limit = { key: string; max: number; windowSec: number; lockSec: number };

const MINUTE = 60;
const WINDOW = 15 * MINUTE;

export { clientIp } from "lib/rate-limit-ip";

// --- Batas yang dipakai di aplikasi -------------------------------------------------------
export const loginLimits = (email: string, ip: string): Limit[] => [
  { key: `login:email:${email}`, max: 5, windowSec: WINDOW, lockSec: WINDOW },
  { key: `login:ip:${ip}`, max: 30, windowSec: WINDOW, lockSec: WINDOW },
];

export const passwordCheckLimit = (userId: string): Limit => ({
  key: `password:user:${userId}`,
  max: 5,
  windowSec: WINDOW,
  lockSec: WINDOW,
});

// Semua request yang mengubah data (POST/PATCH/PUT/DELETE) per IP, dicek di middleware.
export const apiWriteLimit = (ip: string): Limit => ({ key: `api:write:ip:${ip}`, max: 120, windowSec: MINUTE, lockSec: MINUTE });
// Refresh token per IP (token acak 256-bit, tapi tetap dibatasi supaya tidak bisa dibanjiri).
export const refreshLimit = (ip: string): Limit => ({ key: `auth:refresh:ip:${ip}`, max: 60, windowSec: MINUTE, lockSec: MINUTE });

// Aksi per user yang mahal atau mudah di-spam.
export const userLimits = {
  upload: (id: string): Limit => ({ key: `upload:user:${id}`, max: 30, windowSec: 60 * MINUTE, lockSec: 15 * MINUTE }),
  comment: (id: string): Limit => ({ key: `comment:user:${id}`, max: 20, windowSec: MINUTE, lockSec: MINUTE }),
  issue: (id: string): Limit => ({ key: `issue:user:${id}`, max: 30, windowSec: 10 * MINUTE, lockSec: 5 * MINUTE }),
  project: (id: string): Limit => ({ key: `project:user:${id}`, max: 10, windowSec: 60 * MINUTE, lockSec: 15 * MINUTE }),
  search: (id: string): Limit => ({ key: `search:user:${id}`, max: 60, windowSec: MINUTE, lockSec: MINUTE }),
  adminAction: (id: string): Limit => ({ key: `admin:user:${id}`, max: 60, windowSec: 10 * MINUTE, lockSec: 5 * MINUTE }),
};

// --- Inti -----------------------------------------------------------------------------------
let client: ReturnType<typeof createClient> | null = null;
function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return drizzle(neon(url));
}
const db = () => (client ??= createClient());

const keyList = (keys: string[]) => sql.join(keys.map((k) => sql`${k}`), sql`, `);

// Detik tersisa sampai semua kunci terbuka lagi; 0 = boleh.
export async function lockedFor(keys: string[]) {
  if (!keys.length) return 0;
  const result = await db().execute(sql`
    select ceil(extract(epoch from max(locked_until) - now()))::int as seconds
    from login_attempts
    where key in (${keyList(keys)}) and locked_until > now()
  `);
  const seconds = Number((result.rows[0] as { seconds: number | null } | undefined)?.seconds ?? 0);
  return seconds > 0 ? seconds : 0;
}

// Tambah penghitung secara atomik. Kunci terkunci begitu penghitung melewati batas.
async function hit({ key, max, windowSec, lockSec }: Limit) {
  const expired = sql`login_attempts.window_start < now() - make_interval(secs => ${windowSec})`;
  const next = sql`case when ${expired} then 1 else login_attempts.failures + 1 end`;
  const result = await db().execute(sql`
    insert into login_attempts (key, failures, window_start, locked_until)
    values (${key}, 1, now(), case when 1 > ${max} then now() + make_interval(secs => ${lockSec}) end)
    on conflict (key) do update set
      failures = ${next},
      window_start = case when ${expired} then now() else login_attempts.window_start end,
      locked_until = case
        when ${next} > ${max} then now() + make_interval(secs => ${lockSec})
        else login_attempts.locked_until
      end
    returning failures
  `);
  return Number((result.rows[0] as { failures: number }).failures);
}

// Ambil "jatah" untuk satu percobaan. Ditolak bila salah satu kunci sedang terkunci atau
// percobaan ini melewati batas. Kembalikan 0 bila boleh, atau detik tunggu bila ditolak.
export async function consume(limits: Limit[]) {
  const wait = await lockedFor(limits.map((l) => l.key));
  if (wait > 0) return wait;
  let blocked = 0;
  for (const limit of limits) {
    const count = await hit(limit);
    if (count > limit.max) blocked = Math.max(blocked, limit.lockSec);
  }
  if (Math.random() < 0.02) await cleanup();
  return blocked;
}

// Percobaan berhasil: kembalikan jatahnya (mis. login sukses tidak dihitung sebagai percobaan IP).
export async function refund(keys: string[]) {
  if (!keys.length) return;
  await db().execute(sql`
    update login_attempts set failures = greatest(failures - 1, 0)
    where key in (${keyList(keys)}) and (locked_until is null or locked_until < now())
  `);
}

export async function clearFailures(keys: string[]) {
  if (!keys.length) return;
  await db().execute(sql`delete from login_attempts where key in (${keyList(keys)})`);
}

async function cleanup() {
  await db().execute(sql`
    delete from login_attempts
    where window_start < now() - interval '1 day' and (locked_until is null or locked_until < now())
  `);
}

export function tooManyAttempts(seconds: number, message = "Too many attempts") {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return Response.json(
    { message: `${message}. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
    { status: 429, headers: { "Retry-After": String(seconds) } }
  );
}
