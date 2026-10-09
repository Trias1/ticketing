ALTER TABLE "users" ALTER COLUMN "team" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "team" SET DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "team" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "access" text[] DEFAULT '{}';