ALTER TABLE "tickets" DROP CONSTRAINT "tickets_slug_unique";--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_slug_project_id_unique" UNIQUE("slug","project_id");