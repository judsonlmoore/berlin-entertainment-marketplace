ALTER TYPE "public"."booking_origin" ADD VALUE 'profile_enquiry';
--> statement-breakpoint
CREATE TYPE "public"."profile_enquiry_state" AS ENUM('pending', 'interested', 'passed', 'withdrawn');
--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'profile_enquiry_received';
--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'profile_enquiry_interested';
--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'profile_enquiry_passed';
--> statement-breakpoint
CREATE TABLE "profile_enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"entertainer_profile_id" uuid NOT NULL,
	"submitted_by_user_id" text NOT NULL,
	"note" text,
	"proposed_starts_at" timestamp with time zone,
	"proposed_ends_at" timestamp with time zone,
	"proposed_fee_cents" integer,
	"proposed_format" text,
	"state" "profile_enquiry_state" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_enquiries" ADD CONSTRAINT "profile_enquiries_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "profile_enquiries" ADD CONSTRAINT "profile_enquiries_entertainer_profile_id_entertainer_profiles_id_fk" FOREIGN KEY ("entertainer_profile_id") REFERENCES "public"."entertainer_profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "profile_enquiries" ADD CONSTRAINT "profile_enquiries_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "profile_enquiries_venue_state_idx" ON "profile_enquiries" USING btree ("venue_id","state");
--> statement-breakpoint
CREATE INDEX "profile_enquiries_act_state_idx" ON "profile_enquiries" USING btree ("entertainer_profile_id","state");
--> statement-breakpoint
ALTER TABLE "contact_unlocks" ADD COLUMN "profile_enquiry_id" uuid;
--> statement-breakpoint
ALTER TABLE "contact_unlocks" ADD CONSTRAINT "contact_unlocks_profile_enquiry_id_profile_enquiries_id_fk" FOREIGN KEY ("profile_enquiry_id") REFERENCES "public"."profile_enquiries"("id") ON DELETE no action ON UPDATE no action;
