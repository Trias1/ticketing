import { loginUser } from "lib/auth";
import { logAuthEvent, requestMeta } from "lib/audit";
import { clearFailures, clientIp, consume, loginLimits, refund, tooManyAttempts } from "lib/rate-limit";
import { issueSession } from "lib/session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 100) : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    // Brute force: maksimal 5 percobaan per email dan 30 per IP dalam 15 menit. Jatah diambil
    // SEBELUM password dicek (atomik), jadi request paralel tidak bisa melewati batas.
    const ip = clientIp(req.headers);
    const meta = requestMeta(req.headers, ip);
    const limits = loginLimits(email, ip);
    const wait = await consume(limits);
    if (wait > 0) {
      await logAuthEvent({ type: "login_blocked", email, ...meta });
      return tooManyAttempts(wait, "Too many sign-in attempts");
    }

    let user: Awaited<ReturnType<typeof loginUser>>;
    try {
      user = await loginUser(email, password);
    } catch (err) {
      if (err instanceof Error && err.message === "disabled") {
        await logAuthEvent({ type: "login_disabled", email, ...meta });
        return NextResponse.json({ message: "This account has been deactivated. Contact an admin." }, { status: 403 });
      }
      throw err;
    }

    if (!user) {
      await logAuthEvent({ type: "login_failed", email, ...meta });
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    // Login berhasil: hitungan email direset, dan percobaan ini tidak dihitung untuk IP.
    await clearFailures([limits[0].key]);
    await refund([limits[1].key]);
    await logAuthEvent({ type: "login_success", userId: user.id, email: user.email, ...meta });

    // Access token (15 menit) + refresh token (rotasi) sebagai cookie HttpOnly.
    await issueSession(await cookies(), user, meta);

    // Return user data (tanpa token)
    return NextResponse.json({
      id: user.id,
      name: user.name,
      role: user.role,
      team: user.team,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      mustChangePassword: user.mustChangePassword,
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
