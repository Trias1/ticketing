ALTER TABLE "tickets" ADD COLUMN "slug" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "created_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_slug_unique" UNIQUE("slug");