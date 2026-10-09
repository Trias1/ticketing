import { NextResponse } from "next/server";
import { getCurrentUser } from "lib/auth";
import { consume, tooManyAttempts, type Limit } from "lib/rate-limit";

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

type AuthResult =
  | { user: CurrentUser; error: null }
  | { user: null; error: NextResponse };

// Pakai di setiap API route yang butuh login.
export async function requireUser(): Promise<AuthResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }),
    };
  }
  // Selama wajib ganti password, API lain ditutup (yang boleh: /api/profileusers, /api/jwt, logout).
  if (user.mustChangePassword) {
    return {
      user: null,
      error: NextResponse.json(
        { success: false, code: "password_change_required", message: "Set a new password to continue" },
        { status: 403 }
      ),
    };
  }
  return { user, error: null };
}

// Pakai di API route khusus admin.
export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireUser();
  if (result.error) return result;

  if (result.user.role !== "admin") {
    return {
      user: null,
      error: NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}

// Batas per user untuk aksi yang mahal/mudah di-spam. null = boleh lanjut.
export async function limitUser(limit: Limit) {
  const wait = await consume([limit]);
  return wait > 0 ? (tooManyAttempts(wait, "Too many requests") as NextResponse) : null;
}
