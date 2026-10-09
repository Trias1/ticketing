import { cookies } from "next/headers";
import { REFRESH_COOKIE, clearSessionCookies, revokeByToken } from "lib/session";
import { getCurrentUser } from "lib/auth";
import { logAuthEvent, requestMeta } from "lib/audit";
import { clientIp } from "lib/rate-limit";

// Logout mencabut sesi perangkat ini di database, bukan hanya menghapus cookie.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (user) await logAuthEvent({ type: "logout", userId: user.id, email: user.email, ...requestMeta(req.headers, clientIp(req.headers)) });
  const jar = await cookies();
  await revokeByToken(jar.get(REFRESH_COOKIE)?.value);
  clearSessionCookies(jar);
  return Response.json({ message: "Logged out" });
}
