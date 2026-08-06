ALTER TYPE "public"."notification_type" ADD VALUE 'booking_post_gig_survey_ready';--> statement-breakpoint
CREATE TYPE "public"."post_gig_survey_party_role" AS ENUM('venue', 'entertainer');--> statement-breakpoint
CREATE TYPE "public"."post_gig_survey_status" AS ENUM('invited', 'submitted');--> statement-breakpoint
CREATE TABLE "post_gig_surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
	"signer_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"party_role" "post_gig_survey_party_role" NOT NULL,
	"status" "post_gig_survey_status" NOT NULL DEFAULT 'invited',
	"invited_at" timestamp with time zone NOT NULL DEFAULT now(),
	"submitted_at" timestamp with time zone,
	"response" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"notification_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX "post_gig_surveys_booking_signer_uidx" ON "post_gig_surveys" USING btree ("booking_id", "signer_user_id");--> statement-breakpoint
CREATE INDEX "post_gig_surveys_signer_idx" ON "post_gig_surveys" USING btree ("signer_user_id");--> statement-breakpoint

