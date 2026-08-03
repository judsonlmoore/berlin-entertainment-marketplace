ALTER TABLE "booking_terms" ADD COLUMN "proposed_by_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_terms" ADD COLUMN "accepted_by_user_id" text;--> statement-breakpoint
ALTER TABLE "booking_terms" ADD COLUMN "accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "booking_terms" ADD CONSTRAINT "booking_terms_proposed_by_user_id_users_id_fk" FOREIGN KEY ("proposed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_terms" ADD CONSTRAINT "booking_terms_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;