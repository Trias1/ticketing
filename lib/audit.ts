import { neon } from "@neondatabase/serverless";
import { lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { authEvents } from "db/schema";

// Pencatat kejadian keamanan (tabel auth_events). Edge-safe: dipakai route API dan lib/session.
// Gagal mencatat tidak boleh menggagalkan login/aksi user, jadi semua error ditelan.

export type AuthEventType =
  | "login_success"
  | "login_failed"
  | "login_blocked"
  | "login_disabled"
  | "logout"
  | "password_changed"
  | "password_reset"
  | "email_changed"
  | "token_reuse"
  | "user_deactivated"
  | "role_changed";

const RETENTION_DAYS = 90;

let client: ReturnType<typeof createClient> | null = null;
function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return drizzle(neon(url));
}
const db = () => (client ??= createClient());

export async function logAuthEvent(event: {
  type: AuthEventType;
  userId?: string | null;
  email?: string | null;
  actorId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  try {
    await db()
      .insert(authEvents)
      .values({
        type: event.type,
        userId: event.userId ?? null,
        email: event.email?.slice(0, 100) ?? null,
        actorId: event.actorId ?? null,
        ip: event.ip?.slice(0, 64) ?? null,
        userAgent: event.userAgent?.slice(0, 255) ?? null,
      });
    if (Math.random() < 0.02) {
      await db()
        .delete(authEvents)
        .where(lt(authEvents.createdAt, new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)));
    }
  } catch (err) {
    console.error("logAuthEvent failed:", err);
  }
}

// Data request yang dicatat bersama kejadian.
export const requestMeta = (headers: Headers, ip: string) => ({ ip, userAgent: headers.get("user-agent") });
