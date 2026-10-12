import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { clientIp, consume, healthDeepLimit, tooManyAttempts } from "lib/rate-limit";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

// Health check publik untuk uptime monitor. Default TIDAK menyentuh database: monitor memanggil
// ini tiap menit, dan query tiap menit membuat Neon tidak pernah auto-suspend.
// ?deep=1 ikut mengecek database; jangan dipakai oleh monitor.
export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get("deep") !== "1") {
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  try {
    const wait = await consume([healthDeepLimit(clientIp(req.headers))]);
    if (wait > 0) return tooManyAttempts(wait, "Too many requests");

    const { db } = await import("db");
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, db: "up" }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503, headers: NO_STORE });
  }
}
