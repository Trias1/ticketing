import { MAX_PASSWORD_LENGTH, getCurrentUser, hashPassword, newPasswordProblem, revokeSessions } from "lib/auth";
import { logAuthEvent, requestMeta } from "lib/audit";
import { clearFailures, clientIp, consume, passwordCheckLimit, tooManyAttempts } from "lib/rate-limit";
import { issueSession } from "lib/session";
import { cookies } from "next/headers";
import { db } from "db";
import { users } from "db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs"; // pastikan sudah di-install

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    team: user.team,
    avatarUrl: user.avatarUrl,
    mustChangePassword: user.mustChangePassword,
  });
}

// Avatar hanya boleh dari Cloudinary (hasil /api/uploadavatar) atau file lokal default.
function isAllowedAvatarUrl(url: string) {
  return url.startsWith("https://res.cloudinary.com/") || /^\/[\w.-]+$/.test(url);
}

export async function POST(req: Request) {
  const sessionUser = await getCurrentUser();

  if (!sessionUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const currentPassword = str(body.currentPassword);
  const newPassword = str(body.newPassword);
  const confirmPassword = str(body.confirmPassword);

  const updates: { name?: string; email?: string; avatarUrl?: string } = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 100) {
      return NextResponse.json({ message: "Name is required (max 100 characters)" }, { status: 400 });
    }
    updates.name = name;
  }

  if (body.email !== undefined) {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {
      return NextResponse.json({ message: "Invalid email address" }, { status: 400 });
    }
    if (email !== sessionUser.email.toLowerCase()) {
      const taken = await db.query.users.findFirst({ where: sql`lower(${users.email}) = ${email}` });
      if (taken && taken.id !== sessionUser.id) {
        return NextResponse.json({ message: "This email is already used by another user" }, { status: 409 });
      }
    }
    updates.email = email;
  }

  if (body.avatarUrl) {
    if (typeof body.avatarUrl !== "string" || !isAllowedAvatarUrl(body.avatarUrl)) {
      return NextResponse.json({ message: "Invalid avatar URL" }, { status: 400 });
    }
    updates.avatarUrl = body.avatarUrl;
  }

  const emailChanging = updates.email !== undefined && updates.email !== sessionUser.email.toLowerCase();
  const passwordChanging = !!(currentPassword || newPassword || confirmPassword);
  const meta = requestMeta(req.headers, clientIp(req.headers));

  try {
    // Validasi dulu, supaya profil tidak terlanjur berubah kalau ada yang salah.
    let hashedPassword: string | null = null;
    if (passwordChanging) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        return NextResponse.json(
          { message: "Fill in your current password, new password, and confirmation" },
          { status: 400 }
        );
      }
      if (newPassword !== confirmPassword) {
        return NextResponse.json({ message: "New passwords do not match" }, { status: 400 });
      }
      const problem = await newPasswordProblem(newPassword, {
        email: updates.email ?? sessionUser.email,
        name: updates.name ?? sessionUser.name,
      });
      if (problem) return NextResponse.json({ message: problem }, { status: 400 });
    }

    // Ganti password ATAU email wajib memakai password saat ini: sesi yang dicuri tidak bisa
    // mengambil alih akun. Percobaannya dibatasi (atomik) supaya password tidak bisa ditebak.
    if (passwordChanging || emailChanging) {
      if (!currentPassword) {
        return NextResponse.json({ message: "Enter your current password to change your email" }, { status: 400 });
      }
      const limit = passwordCheckLimit(sessionUser.id);
      const wait = await consume([limit]);
      if (wait > 0) return tooManyAttempts(wait, "Too many password attempts");

      const userFromDb = await db
        .select({ password: users.password })
        .from(users)
        .where(eq(users.id, sessionUser.id))
        .then((res) => res[0]);

      const isMatch =
        currentPassword.length <= MAX_PASSWORD_LENGTH &&
        (await bcrypt.compare(currentPassword, userFromDb.password));
      if (!isMatch) {
        return NextResponse.json(
          { message: "Current password is incorrect" },
          // 400, bukan 401: 401 dipakai khusus "sesi habis" (memicu refresh otomatis di browser).
          { status: 400 }
        );
      }
      await clearFailures([limit.key]);

      if (passwordChanging) {
        if (await bcrypt.compare(newPassword, userFromDb.password)) {
          return NextResponse.json({ message: "New password must be different from the current one" }, { status: 400 });
        }
        hashedPassword = await hashPassword(newPassword);
      }
    }

    const toSet = hashedPassword ? { ...updates, password: hashedPassword, mustChangePassword: false } : updates;
    if (Object.keys(toSet).length > 0) {
      await db.update(users).set(toSet).where(eq(users.id, sessionUser.id));
    }

    if (emailChanging) {
      await logAuthEvent({ type: "email_changed", userId: sessionUser.id, email: updates.email, ...meta });
    }

    // Password berubah: semua sesi lain (perangkat lain) dicabut, sesi ini dapat sesi baru.
    if (hashedPassword) {
      const sessionVersion = (await revokeSessions(sessionUser.id)) ?? sessionUser.sessionVersion + 1;
      await issueSession(await cookies(), { ...sessionUser, sessionVersion, mustChangePassword: false }, meta);
      await logAuthEvent({ type: "password_changed", userId: sessionUser.id, email: updates.email ?? sessionUser.email, ...meta });
    }

    return NextResponse.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ message: "Failed to update profile" }, { status: 500 });
  }
}
