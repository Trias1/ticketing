import { NextResponse } from "next/server";
import { db } from "db";
import { users } from "db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "lib/auth";

// Penanda "online": hanya untuk user yang masih aktif.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  return NextResponse.json({ message: "Heartbeat updated" });
}
