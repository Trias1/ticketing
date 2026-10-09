import { cookies } from "next/headers";
import { REFRESH_COOKIE, clearSessionCookies, rotateSession } from "lib/session";
import { clientIp, consume, refreshLimit, tooManyAttempts } from "lib/rate-limit";

// Tukar refresh token (cookie) dengan access token + refresh token baru.
// Dipanggil otomatis oleh browser saat API membalas 401 (components/AuthFetch.tsx).
export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const wait = await consume([refreshLimit(ip)]);
  if (wait > 0) return tooManyAttempts(wait, "Too many requests");

  const jar = await cookies();
  const result = await rotateSession(jar, jar.get(REFRESH_COOKIE)?.value, {
    ip,
    userAgent: req.headers.get("user-agent"),
  });

  if (!result.ok) {
    clearSessionCookies(jar);
    return Response.json({ message: "Session expired. Please sign in again." }, { status: 401 });
  }
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
