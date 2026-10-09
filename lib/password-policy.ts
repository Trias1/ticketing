// Aturan password yang sama untuk server dan form di browser (tanpa dependensi Node).
// Mengikuti pedoman NIST: panjang lebih penting daripada simbol, tolak password pasaran
// dan yang mudah ditebak dari data akun sendiri.

export const PASSWORD_MIN = 10;
// bcrypt hanya membaca 72 byte pertama; lebih dari itu tidak ikut dicek, jadi ditolak.
export const PASSWORD_MAX = 72;
const byteLength = (pw: string) => new TextEncoder().encode(pw).length;
const PASSPHRASE_LENGTH = 16; // sepanjang ini cukup walau hanya huruf (passphrase)

// Password yang paling sering dipakai/bocor. Dicek tanpa huruf besar & angka di ujung,
// jadi "Password123!" atau "Admin2024" ikut tertolak.
const COMMON = new Set([
  "password", "passw0rd", "p@ssw0rd", "p@ssword", "admin", "administrator", "welcome", "letmein", "qwerty",
  "qwertyuiop", "asdfgh", "asdfghjkl", "zxcvbn", "iloveyou", "monkey", "dragon", "football", "baseball",
  "master", "superman", "batman", "sunshine", "princess", "shadow", "trustno", "starwars", "login",
  "secret", "changeme", "default", "root", "toor", "test", "tester", "testing", "guest", "user", "demo",
  "abc", "abcdef", "abcdefg", "abcd", "qazwsx", "1q2w3e4r", "1qaz2wsx", "zaq12wsx", "ticketing", "ticket",
  "tiket", "lintasarta", "indonesia", "jakarta", "bismillah", "sayang", "rahasia", "katasandi", "cinta",
  "company", "office", "summer", "winter", "spring", "autumn", "january", "december", "computer", "internet",
  "samsung", "google", "microsoft", "apple", "github", "gitlab", "devops", "cloud", "server", "database",
]);

const SEQUENCES = ["abcdefghijklmnopqrstuvwxyz", "qwertyuiopasdfghjklzxcvbnm", "01234567890"];

export type PasswordContext = { email?: string | null; name?: string | null };

export type PasswordCheck = {
  ok: boolean;
  /** Pesan untuk aturan yang belum terpenuhi (bahasa Inggris, langsung tampil di UI). */
  errors: string[];
  /** 0 (sangat lemah) sampai 4 (kuat). */
  score: 0 | 1 | 2 | 3 | 4;
  label: "Too weak" | "Weak" | "Fair" | "Good" | "Strong";
  rules: { id: string; label: string; met: boolean }[];
};

const classes = (pw: string) =>
  [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length;

// Bagian inti tanpa angka/simbol di ujung dan huruf besar: "Admin2024!" -> "admin".
const core = (pw: string) => pw.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, "");

function isSimplePattern(pw: string) {
  const lower = pw.toLowerCase();
  if (/^(.)\1+$/.test(lower)) return true; // aaaaaaaaaa
  if (/^(.{1,3})\1{2,}$/.test(lower)) return true; // abcabcabc, 121212
  for (const seq of SEQUENCES) {
    const rev = [...seq].reverse().join("");
    if (lower.length >= 6 && (seq.includes(lower) || rev.includes(lower))) return true;
  }
  return false;
}

function personalParts({ email, name }: PasswordContext) {
  const parts = new Set<string>();
  const local = email?.split("@")[0]?.toLowerCase() ?? "";
  for (const p of [local, ...local.split(/[._+-]/)]) if (p.length >= 4) parts.add(p);
  for (const p of (name ?? "").toLowerCase().split(/\s+/)) if (p.length >= 4) parts.add(p);
  return [...parts];
}

export function checkPassword(password: string, context: PasswordContext = {}): PasswordCheck {
  const pw = password ?? "";
  const lower = pw.toLowerCase();
  const variety = classes(pw);
  const longEnough = pw.length >= PASSWORD_MIN;
  const passphrase = pw.length >= PASSPHRASE_LENGTH;
  const common = COMMON.has(lower) || COMMON.has(core(pw)) || isSimplePattern(pw);
  const personal = personalParts(context).some((p) => lower.includes(p));

  const rules = [
    { id: "length", label: `At least ${PASSWORD_MIN} characters`, met: longEnough && byteLength(pw) <= PASSWORD_MAX },
    {
      id: "variety",
      label: `Mix 3 of: lowercase, uppercase, number, symbol (or use ${PASSPHRASE_LENGTH}+ characters)`,
      met: variety >= 3 || passphrase,
    },
    { id: "common", label: "Not a common or easy-to-guess password", met: pw.length > 0 && !common },
    { id: "personal", label: "Doesn't contain your name or email", met: pw.length > 0 && !personal },
  ];

  const errors: string[] = [];
  if (byteLength(pw) > PASSWORD_MAX) errors.push(`Password must be at most ${PASSWORD_MAX} characters`);
  else if (!longEnough) errors.push(`Password must be at least ${PASSWORD_MIN} characters`);
  if (!rules[1].met) errors.push("Use at least 3 of: lowercase, uppercase, numbers, symbols — or a longer passphrase");
  if (pw && common) errors.push("This password is too common or easy to guess");
  if (pw && personal) errors.push("Password must not contain your name or email");

  // Skor kasar untuk indikator: panjang + variasi, dipotong bila ada aturan yang gagal.
  let score = 0;
  if (pw.length >= 8) score++;
  if (longEnough) score++;
  if (variety >= 3 || passphrase) score++;
  if (pw.length >= 14 && variety >= 3) score++;
  if (pw.length >= 20) score++;
  if (errors.length) score = Math.min(score, 1);
  const s = Math.min(score, 4) as PasswordCheck["score"];
  const label = (["Too weak", "Weak", "Fair", "Good", "Strong"] as const)[s];

  return { ok: errors.length === 0, errors, score: s, label, rules };
}
