import { db } from "db";
import { users } from "db/schema";
import { eq, sql } from "drizzle-orm";
import { compare, getRounds, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, revokeAllSessions, verifyAccessToken } from "lib/session";
import { PASSWORD_MAX, checkPassword, type PasswordContext } from "lib/password-policy";
import { PWNED_MESSAGE, pwnedCount } from "lib/pwned";

// Cost bcrypt; hash lama dengan cost lebih rendah di-upgrade otomatis saat user login.
const BCRYPT_COST = 12;

// Hash bcrypt (cost sama) dari string acak: dipakai saat email tidak ditemukan supaya waktu respons
// sama dengan password salah (penyerang tidak bisa menebak email mana yang terdaftar).
const DUMMY_HASH = "$2b$12$k8pFGTbSP5onEUmPNPTWT.sS1lUSMvXKSMTnk8riddHzayY2bbhbu";

// bcrypt hanya memakai 72 byte pertama; batasi panjang supaya input raksasa tidak membebani server.
export const MAX_PASSWORD_LENGTH = PASSWORD_MAX;

export const hashPassword = (password: string) => hash(password, BCRYPT_COST);

// Validasi password baru: aturan (lib/password-policy) + cek kebocoran. null = boleh dipakai.
export async function newPasswordProblem(password: string, context: PasswordContext) {
  const result = checkPassword(password, context);
  if (!result.ok) return result.errors[0];
  if (((await pwnedCount(password)) ?? 0) > 0) return PWNED_MESSAGE;
  return null;
}

// Cabut semua sesi user ini (dipanggil saat password, role, atau status akun berubah):
// access token lama ditolak lewat session_version, refresh token dicabut di database.
export async function revokeSessions(userId: string) {
  const [row] = await db
    .update(users)
    .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, userId))
    .returning({ sessionVersion: users.sessionVersion });
  await revokeAllSessions(userId);
  return row?.sessionVersion ?? null;
}

// ===========================
// Login: cek email & password. Token dibuat oleh lib/session (issueSession).
// ===========================
export async function loginUser(email: string, password: string) {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  const user = await db.query.users.findFirst({
    where: sql`lower(${users.email}) = ${normalizedEmail}`,
  });

  if (password.length > MAX_PASSWORD_LENGTH) return null;
  if (!user) {
    await compare(password, DUMMY_HASH);
    return null;
  }
  if (!(await compare(password, user.password))) return null;
  if (!user.isActive) throw new Error("disabled");

  // Password sedang diketahui (plaintext) hanya di momen ini: manfaatkan untuk upgrade hash
  // & menandai password lama yang tidak memenuhi aturan baru supaya wajib diganti.
  const upgradeHash = getRounds(user.password) < BCRYPT_COST;
  const weak = !checkPassword(password, { email: user.email, name: user.name }).ok;
  const mustChangePassword = user.mustChangePassword || weak;

  await db
    .update(users)
    .set({
      lastLoginAt: new Date(),
      mustChangePassword,
      ...(upgradeHash ? { password: await hashPassword(password) } : {}),
    })
    .where(eq(users.id, user.id));

  return { ...user, mustChangePassword };
}

// ===========================
// getCurrentUser dari access token
// ===========================
export async function getCurrentUser() {
  const claims = await verifyAccessToken((await cookies()).get(ACCESS_COOKIE)?.value);
  if (!claims?.sub) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, claims.sub),
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      team: true,
      avatarUrl: true,
      access: true,
      isActive: true,
      sessionVersion: true,
      mustChangePassword: true,
    },
  });

  // User nonaktif atau token dari sesi yang sudah dicabut langsung kehilangan akses.
  if (!user || user.isActive === false) return null;
  if (claims.ver !== user.sessionVersion) return null;
  return user;
}

// ===========================
// Register
// ===========================
type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role: string;
  team: string;
  access?: string[];
  mustChangePassword?: boolean;
};

export async function registerUser({
  name,
  email,
  password,
  role,
  team,
  access = [],
  mustChangePassword = true,
}: RegisterInput) {
  const existing = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
    .then((res) => res[0]);

  if (existing) throw new Error("User already exists");

  const hashedPassword = await hashPassword(password);
  const defaultAvatar = "/avatarDefault.png";

  const [newUser] = await db
    .insert(users)
    .values({
      name,
      email,
      password: hashedPassword,
      role,
      team,
      access,
      isActive: true,
      // Password dibuat admin, jadi user wajib menggantinya saat login pertama.
      mustChangePassword,
      avatarUrl: defaultAvatar,
    })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      team: users.team,
      access: users.access,
    });

  return newUser;
}
