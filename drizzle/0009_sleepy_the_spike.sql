CREATE TABLE "ticket_labels" (
	"ticket_id" uuid NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "ticket_labels_ticket_id_label_pk" PRIMARY KEY("ticket_id","label")
);
--> statement-breakpoint
ALTER TABLE "ticket_labels" ADD CONSTRAINT "ticket_labels_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;