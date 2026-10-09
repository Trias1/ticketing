"use client";

// Access token cuma berlaku 15 menit. Saat API membalas 401, refresh sesi sekali lalu ulangi
// request-nya, supaya user tidak tiba-tiba keluar di tengah pekerjaan. Dipasang saat modul dimuat
// (bukan di useEffect) agar sudah aktif sebelum komponen lain mulai fetch.

const SKIP = new Set(["/api/login", "/api/logout", "/api/auth/refresh"]);

if (typeof window !== "undefined" && !(window as { __authFetch?: boolean }).__authFetch) {
  (window as { __authFetch?: boolean }).__authFetch = true;
  const originalFetch = window.fetch.bind(window);
  let refreshing: Promise<boolean> | null = null;

  // Banyak request yang gagal bersamaan cukup memicu satu refresh.
  const refresh = () => {
    refreshing ??= originalFetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        setTimeout(() => (refreshing = null), 0);
      });
    return refreshing;
  };

  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    const eligible = url.origin === window.location.origin && url.pathname.startsWith("/api/") && !SKIP.has(url.pathname);
    // Request object hanya bisa dibaca sekali; simpan salinannya untuk dikirim ulang.
    const retryInput = eligible && input instanceof Request ? input.clone() : input;

    const response = await originalFetch(input, init);
    if (response.status !== 401 || !eligible) return response;

    if (!(await refresh())) {
      if (window.location.pathname.startsWith("/dashboard")) window.location.href = "/login";
      return response;
    }
    return originalFetch(retryInput, init);
  };
}

export default function AuthFetch() {
  return null;
}
