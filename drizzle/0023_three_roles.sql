-- Tiga role: superadmin (dulu "admin"), admin (admin tim, baru), user (dulu "staff").
-- Hanya data; skema tidak berubah. Jalankan dalam SATU transaksi, sekaligus dengan deploy kode yang
-- memakai role baru. Dua UPDATE pertama aman dijalankan ulang (baris yang sudah dimigrasi tidak cocok
-- lagi); menjalankan ulang hanya membuat semua orang logout sekali lagi.
--
-- Semua sesi dicabut (session_version naik) karena token lama masih membawa role & tim lama,
-- jadi setiap orang perlu login ulang sekali.
UPDATE "users" SET "role" = 'superadmin', "team" = 'superadmin' WHERE "role" = 'admin' AND "team" = 'admin';
--> statement-breakpoint
UPDATE "users" SET "role" = 'user' WHERE "role" = 'staff';
--> statement-breakpoint
UPDATE "users" SET "session_version" = "session_version" + 1;
--> statement-breakpoint
UPDATE "refresh_tokens" SET "revoked_at" = now() WHERE "revoked_at" IS NULL;
