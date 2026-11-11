import { NextResponse } from "next/server";
import { getCurrentUser } from "lib/auth";
import { consume, tooManyAttempts, type Limit } from "lib/rate-limit";
import { isSuperadmin, managesPeople } from "lib/roles";

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

const forbidden = (): AuthResult => ({
  user: null,
  error: NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 }),
});

// API khusus superadmin (monitoring, log keamanan, ubah role/tim).
export async function requireSuperadmin(): Promise<AuthResult> {
  const result = await requireUser();
  if (result.error) return result;
  return isSuperadmin(result.user) ? result : forbidden();
}

// API pengelolaan akun: superadmin untuk semua akun, admin hanya untuk user di timnya.
// Batas per akun target dicek di route dengan canManageAccount.
export async function requirePeopleManager(): Promise<AuthResult> {
  const result = await requireUser();
  if (result.error) return result;
  return managesPeople(result.user) ? result : forbidden();
}

// Batas per user untuk aksi yang mahal/mudah di-spam. null = boleh lanjut.
export async function limitUser(limit: Limit) {
  const wait = await consume([limit]);
  return wait > 0 ? (tooManyAttempts(wait, "Too many requests") as NextResponse) : null;
}
