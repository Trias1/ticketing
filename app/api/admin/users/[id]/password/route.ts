import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "db";
import { users } from "db/schema";
import { limitUser, requireAdmin } from "lib/api-auth";
import { logAuthEvent, requestMeta } from "lib/audit";
import { clientIp, userLimits } from "lib/rate-limit";
import { hashPassword, newPasswordProblem, revokeSessions } from "lib/auth";
import { isUuid } from "lib/membership";

// Huruf kecil + angka tanpa karakter yang mirip (0/o, 1/l/i), dikelompokkan per 4: mudah diketik & dibacakan.
const CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

function temporaryPassword() {
  const group = () => Array.from({ length: 4 }, () => CHARS[randomInt(CHARS.length)]).join("");
  return [group(), group(), group()].join("-");
}

// Admin mereset password user lain. Password sementara hanya dikembalikan sekali di respons ini.
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const limited = await limitUser(userLimits.adminAction(auth.user.id));
  if (limited) return limited;

  if (!isUuid(params.id)) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }
  if (params.id === auth.user.id) {
    return NextResponse.json(
      { message: "Use Edit profile to change your own password" },
      { status: 400 }
    );
  }

  // Admin boleh menentukan password sendiri; kalau kosong dibuatkan otomatis.
  const body = await req.json().catch(() => ({}));
  const custom = typeof body?.password === "string" ? body.password.trim() : "";
  if (custom) {
    const target = await db.query.users.findFirst({ where: eq(users.id, params.id), columns: { email: true, name: true } });
    const problem = await newPasswordProblem(custom, { email: target?.email, name: target?.name });
    if (problem) return NextResponse.json({ message: problem }, { status: 400 });
  }

  try {
    const password = custom || temporaryPassword();
    const updated = await db
      .update(users)
      // User wajib membuat password sendiri saat login berikutnya.
      .set({ password: await hashPassword(password), mustChangePassword: true })
      .where(eq(users.id, params.id))
      .returning({ id: users.id, name: users.name });

    if (updated.length === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    // Sesi lama user ini (mungkin milik orang yang membobol akunnya) langsung tidak berlaku.
    await revokeSessions(params.id);
    await logAuthEvent({ type: "password_reset", userId: params.id, actorId: auth.user.id, ...requestMeta(req.headers, clientIp(req.headers)) });

    return NextResponse.json(
      { message: "Password reset", password },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("POST /api/admin/users/[id]/password error:", error);
    return NextResponse.json({ message: "Failed to reset password" }, { status: 500 });
  }
}
