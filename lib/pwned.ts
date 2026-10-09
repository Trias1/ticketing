import { createHash } from "crypto";

// Cek apakah password pernah muncul di kebocoran data (Have I Been Pwned, k-anonymity):
// hanya 5 karakter awal hash SHA-1 yang dikirim, password & hash lengkap tidak pernah keluar.
// Bila layanan tidak bisa dihubungi, kembalikan null supaya user tidak terhalang.
export async function pwnedCount(password: string): Promise<number | null> {
  const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "ticketing-ms-password-check" },
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    if (!res.ok) return null;
    for (const line of (await res.text()).split("\n")) {
      const [s, count] = line.trim().split(":");
      if (s === suffix) return Number(count) || 0;
    }
    return 0;
  } catch {
    return null;
  }
}

export const PWNED_MESSAGE = "This password has appeared in a data breach. Choose a different one.";
