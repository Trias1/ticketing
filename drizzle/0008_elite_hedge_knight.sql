ALTER TABLE "tickets" ADD COLUMN "due_date" timestamp;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "labels" text[] DEFAULT '{}';