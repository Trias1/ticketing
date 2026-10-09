// IP klien untuk rate limit. Edge-safe (dipakai middleware).
//
// Hanya percaya header yang diisi proxy kita sendiri:
// - x-real-ip: di Vercel diisi oleh Vercel (nilai kiriman klien ditimpa). Kalau app dipasang di
//   belakang Nginx/Caddy, set header ini di proxy (`proxy_set_header X-Real-IP $remote_addr;`).
// - Cadangan: entri PALING KANAN x-forwarded-for (ditambahkan proxy terakhir). Entri paling kiri
//   bisa diisi sembarang oleh penyerang, jadi tidak dipakai.
export function clientIp(headers: Headers) {
  const real = headers.get("x-real-ip")?.trim();
  const forwarded = headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  const ip = real || forwarded?.[forwarded.length - 1] || "unknown";
  return ip.slice(0, 64);
}
