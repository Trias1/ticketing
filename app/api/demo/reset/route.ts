import { NextResponse } from "next/server";
import { isDemo } from "lib/demo";
import { resetDemoData } from "lib/demo-seed";

// Dipanggil Vercel Cron setiap hari (lihat vercel.json). Vercel mengirim
// "Authorization: Bearer $CRON_SECRET"; tanpa CRON_SECRET route ini tidak bisa dipakai.
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!isDemo() || !secret) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const counts = await resetDemoData();
    return NextResponse.json({ ok: true, ...counts });
  } catch (err) {
    console.error("Demo reset failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
