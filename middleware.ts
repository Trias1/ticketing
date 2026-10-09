import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { apiWriteLimit, clientIp, consume, tooManyAttempts } from "lib/rate-limit";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  rotateSession,
  verifyAccessToken,
  type AccessClaims,
  type CookieJar,
} from "lib/session";

type PendingCookie = Parameters<CookieJar["set"]>;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// CSRF lapis kedua (selain cookie SameSite=Lax): request yang mengubah data ke /api harus berasal
// dari origin aplikasi ini sendiri.
function crossSiteWrite(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return false;
  const origin = request.headers.get("origin");
  if (origin) return origin !== request.nextUrl.origin;
  const site = request.headers.get("sec-fetch-site");
  return site !== null && site !== "same-origin" && site !== "none";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (crossSiteWrite(request)) {
      return NextResponse.json({ message: "Cross-site request blocked" }, { status: 403 });
    }
    // Batas request yang mengubah data per IP, sebelum sampai ke route mana pun.
    if (!SAFE_METHODS.has(request.method)) {
      const wait = await consume([apiWriteLimit(clientIp(request.headers))]);
      if (wait > 0) return tooManyAttempts(wait, "Too many requests") as NextResponse;
    }
    return NextResponse.next();
  }

  let claims: AccessClaims | null = await verifyAccessToken(request.cookies.get(ACCESS_COOKIE)?.value);

  // Access token habis tapi refresh token masih ada: perbarui di sini, sebelum halaman dirender.
  const pending: PendingCookie[] = [];
  if (!claims && request.cookies.get(REFRESH_COOKIE)) {
    const jar: CookieJar = { set: (...args) => pending.push(args) };
    const result = await rotateSession(jar, request.cookies.get(REFRESH_COOKIE)?.value, {
      ip: clientIp(request.headers),
      userAgent: request.headers.get("user-agent"),
    });
    if (result.ok) {
      claims = await verifyAccessToken(result.accessToken);
      // Server component di request ini langsung membaca access token yang baru.
      request.cookies.set(ACCESS_COOKIE, result.accessToken);
    }
  }

  const finish = (response: NextResponse) => {
    for (const [name, value, options] of pending) response.cookies.set(name, value, options);
    return response;
  };

  if (!claims) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    clearSessionCookies(response.cookies);
    return response;
  }

  const role = claims.role?.toLowerCase();
  const team = claims.team?.toLowerCase();
  const next = () => finish(NextResponse.next({ request: { headers: request.headers } }));
  const redirect = (path: string) => finish(NextResponse.redirect(new URL(path, request.url)));

  // Wajib ganti password: hanya halaman profil sendiri yang boleh dibuka.
  if (claims.pwc) {
    const profile = `/dashboard/${role === "admin" ? "admin" : team}/profile`;
    if (pathname !== profile) return redirect(`${profile}?required=password`);
    return next();
  }

  const dashboardMatch = pathname.match(/^\/dashboard\/([^\/]+)/);
  if (dashboardMatch) {
    const pathTeam = dashboardMatch[1];

    if (role === "admin") return next();
    if (pathTeam === "admin") return redirect("/login");

    if (["cloud", "pm", "devops"].includes(pathTeam)) {
      if (role !== "staff") return redirect("/login");
      // Akses project dicek per member di halaman & API, karena staff bisa ikut project tim lain.
    } else {
      // Segmen tim tidak dikenal: arahkan ke dashboard tim user sendiri.
      return redirect(`/dashboard/${team}`);
    }
  }

  return next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
