// Isi (atau isi ulang) database DEMO dengan data contoh. Semua data di database itu dihapus dulu.
// Membaca env seperti `npm run dev` (.env.development.local menang atas .env.local).
//   npx tsx scripts/seed-demo.ts          isi ulang database yang sudah ditandai demo
//   npx tsx scripts/seed-demo.ts --init   pertama kali, untuk database demo yang masih kosong
// Ditolak kalau NEXT_PUBLIC_DEMO_MODE bukan 1, atau kalau databasenya bukan database demo.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), true);

async function main() {
  const { resetDemoData } = await import("../lib/demo-seed");
  const counts = await resetDemoData({ init: process.argv.includes("--init") });
  console.log("Demo data ready:", counts);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
