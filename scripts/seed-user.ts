// Membuat akun admin pertama. Email & password diambil dari environment, tidak pernah ditulis di kode:
//   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npx tsx scripts/seed-user.ts
import { sql } from "drizzle-orm";
import { hash } from "bcryptjs";
import { db } from "../db";
import { users } from "../db/schema";
import { checkPassword } from "../lib/password-policy";

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Set SEED_ADMIN_EMAIL to a valid email address");
  }
  const check = checkPassword(password, { email, name: "Admin" });
  if (!check.ok) throw new Error(`SEED_ADMIN_PASSWORD: ${check.errors[0]}`);

  const existing = await db.query.users.findFirst({ where: sql`lower(${users.email}) = ${email}` });
  if (existing) {
    console.log("A user with this email already exists; nothing changed.");
    return;
  }

  await db.insert(users).values({
    name: "Admin",
    email,
    password: await hash(password, 12),
    role: "admin",
    team: "admin",
    isActive: true,
  });
  console.log("Admin user created:", email);
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
