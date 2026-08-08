-- Offer/counter negotiation: change notes + supersede prior open offers

ALTER TABLE "booking_terms" ADD COLUMN IF NOT EXISTS "change_note" text;
--> statement-breakpoint
ALTER TABLE "booking_terms" ADD COLUMN IF NOT EXISTS "superseded_at" timestamp with time zone;
