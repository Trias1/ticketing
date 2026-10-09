-- Paksa ganti password (akun baru, reset admin, password lemah). Hanya menambah kolom.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" boolean DEFAULT false NOT NULL;
