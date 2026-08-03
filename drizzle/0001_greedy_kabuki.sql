ALTER TABLE "users" ADD COLUMN "anonymized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "anonymized_reason" text;