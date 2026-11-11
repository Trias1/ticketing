import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "db";
import { users } from "db/schema";
import { logAuthEvent, requestMeta } from "lib/audit";
import { demoLogin, isDemo } from "lib/demo";
import { clientIp, consume, tooManyAttempts } from "lib/rate-limit";
import { issueSession } from "lib/session";

// Masuk sekali klik ke akun demo bawaan. Hanya ada di instance demo; di tempat lain 404.
export async function POST(req: Request) {
  if (!isDemo()) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const account = demoLogin(body?.account);
  if (!account) return NextResponse.json({ message: "Unknown demo account" }, { status: 400 });

  const ip = clientIp(req.headers);
  const wait = await consume([{ key: `demo:login:ip:${ip}`, max: 20, windowSec: 15 * 60, lockSec: 5 * 60 }]);
  if (wait > 0) return tooManyAttempts(wait, "Too many sign-ins, try again in a moment");

  const user = await db.query.users.findFirst({ where: eq(users.email, account.email) });
  if (!user || user.isActive === false) {
    return NextResponse.json({ message: "The demo is being reset. Try again in a minute." }, { status: 503 });
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  const meta = requestMeta(req.headers, ip);
  await logAuthEvent({ type: "login_success", userId: user.id, email: user.email, ...meta });
  // Akun demo tidak pernah wajib ganti password.
  await issueSession(await cookies(), { ...user, mustChangePassword: false }, meta);

  return NextResponse.json({ id: user.id, name: user.name, role: user.role, team: user.team });
}
