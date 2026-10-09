// Secret HS256 harus panjang & acak; secret pendek bisa ditebak offline dari token milik sendiri
// lalu dipakai memalsukan token admin. App menolak jalan dengan secret yang lemah.
let cached: Uint8Array | null = null;

export function jwtSecret() {
  if (cached) return cached;
  const value = process.env.JWT_SECRET ?? "";
  if (value.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters (use a random value)");
  }
  cached = new TextEncoder().encode(value);
  return cached;
}
