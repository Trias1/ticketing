-- Tim disimpan di tabel, dibuat & diganti namanya oleh superadmin. Hanya menambah: users.team dan
-- projects.team tetap berisi slug tim. Aman dijalankan sebelum kode baru di-deploy.
CREATE TABLE IF NOT EXISTS "teams" (
	"slug" varchar(40) PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "teams_name_lower_idx" ON "teams" (lower("name"));
--> statement-breakpoint
INSERT INTO "teams" ("slug", "name") VALUES ('cloud', 'Cloud'), ('devops', 'DevOps'), ('pm', 'PM')
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
-- Tim lain yang sudah dipakai akun atau project ikut didaftarkan (nama = slug).
INSERT INTO "teams" ("slug", "name")
SELECT DISTINCT t, t FROM (
	SELECT "team" AS t FROM "users" UNION SELECT "team" FROM "projects"
) x
WHERE t NOT IN ('superadmin', 'admin', 'user') AND t <> ''
ON CONFLICT DO NOTHING;
