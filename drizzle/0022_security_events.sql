-- Versi sesi di refresh token + log keamanan. Hanya menambah; token aktif diisi versi user saat ini
-- supaya tidak ada yang ter-logout karena migrasi.
ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "session_version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "refresh_tokens" r SET "session_version" = u."session_version" FROM "users" u WHERE u."id" = r."user_id" AND r."revoked_at" IS NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(40) NOT NULL,
	"user_id" uuid REFERENCES "users"("id") ON DELETE set null,
	"email" varchar(100),
	"actor_id" uuid REFERENCES "users"("id") ON DELETE set null,
	"ip" varchar(64),
	"user_agent" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_events_created_idx" ON "auth_events" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_events_user_idx" ON "auth_events" ("user_id");
