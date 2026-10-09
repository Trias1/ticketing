ALTER TABLE "tickets" DROP CONSTRAINT "tickets_slug_unique";--> statement-breakpoint
ALTER TABLE "tickets" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "tickets" DROP COLUMN "created_by";