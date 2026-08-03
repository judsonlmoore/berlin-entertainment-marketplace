CREATE TYPE "public"."application_state" AS ENUM('draft', 'submitted', 'clarification_requested', 'withdrawn', 'rejected', 'shortlisted');--> statement-breakpoint
CREATE TYPE "public"."approval_state" AS ENUM('applied', 'invited', 'approved', 'suspended', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."booking_origin" AS ENUM('application', 'direct_request');--> statement-breakpoint
CREATE TYPE "public"."booking_state" AS ENUM('requested', 'applied', 'shortlisted', 'accepted', 'terms_agreed', 'agreement_generated', 'partially_signed', 'confirmed', 'declined', 'rejected', 'withdrawn', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."calendar_entry_state" AS ENUM('available', 'unavailable', 'tentative_hold', 'requested', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."calendar_owner_type" AS ENUM('entertainer', 'venue_space');--> statement-breakpoint
CREATE TYPE "public"."contact_kind" AS ENUM('email', 'phone', 'other');--> statement-breakpoint
CREATE TYPE "public"."contact_owner_type" AS ENUM('user', 'venue', 'entertainer');--> statement-breakpoint
CREATE TYPE "public"."deposit_status" AS ENUM('not_required', 'pending', 'received', 'refunded', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."direct_request_state" AS ENUM('requested', 'changes_proposed', 'accepted', 'declined', 'withdrawn', 'expired');--> statement-breakpoint
CREATE TYPE "public"."marketplace_role" AS ENUM('entertainer', 'venue');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'invited', 'removed');--> statement-breakpoint
CREATE TYPE "public"."opportunity_state" AS ENUM('draft', 'open', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."portfolio_item_kind" AS ENUM('image', 'link', 'youtube');--> statement-breakpoint
CREATE TYPE "public"."profile_publication_state" AS ENUM('draft', 'submitted', 'approved', 'changes_requested', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."venue_membership_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "authenticators" (
	"credential_id" text NOT NULL,
	"user_id" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"credential_public_key" text NOT NULL,
	"counter" integer NOT NULL,
	"credential_device_type" text NOT NULL,
	"credential_backed_up" boolean NOT NULL,
	"transports" text,
	CONSTRAINT "authenticators_user_id_credential_id_pk" PRIMARY KEY("user_id","credential_id"),
	CONSTRAINT "authenticators_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp,
	"image" text,
	"preferred_locale" text DEFAULT 'en' NOT NULL,
	"is_platform_staff" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "agreement_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locale" text NOT NULL,
	"version" text NOT NULL,
	"legal_review_status" text DEFAULT 'draft' NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"booking_terms_id" uuid NOT NULL,
	"german_template_version" text NOT NULL,
	"english_template_version" text NOT NULL,
	"german_body" text NOT NULL,
	"english_body" text NOT NULL,
	"provider" text,
	"provider_envelope_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_clarification_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"author_user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"entertainer_profile_id" uuid NOT NULL,
	"message" text NOT NULL,
	"quote_min_cents" integer NOT NULL,
	"quote_max_cents" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"state" "application_state" DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"correlation_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"proposed_by_user_id" text NOT NULL,
	"accepted_by_user_id" text,
	"accepted_at" timestamp with time zone,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'Europe/Berlin' NOT NULL,
	"fee_cents" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"performance_format" text NOT NULL,
	"cancellation_terms" text NOT NULL,
	"production_obligations" text NOT NULL,
	"deposit_terms" text,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"origin_type" "booking_origin" NOT NULL,
	"origin_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"entertainer_profile_id" uuid NOT NULL,
	"state" "booking_state" NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deposit_status" "deposit_status" DEFAULT 'not_required' NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancelled_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_type" "calendar_owner_type" NOT NULL,
	"owner_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"display_timezone" text DEFAULT 'Europe/Berlin' NOT NULL,
	"state" "calendar_entry_state" NOT NULL,
	"hold_expires_at" timestamp with time zone,
	"booking_id" uuid,
	"source_type" text,
	"source_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_entries_window_chk" CHECK ("calendar_entries"."ends_at" > "calendar_entries"."starts_at"),
	CONSTRAINT "calendar_entries_hold_expiry_chk" CHECK (("calendar_entries"."state" <> 'tentative_hold') OR ("calendar_entries"."hold_expires_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "contact_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_type" "contact_owner_type" NOT NULL,
	"owner_id" text NOT NULL,
	"kind" "contact_kind" NOT NULL,
	"value" text NOT NULL,
	"is_preferred" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_unlocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid,
	"application_id" uuid,
	"direct_request_id" uuid,
	"unlocked_for_user_id" text NOT NULL,
	"contact_method_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposit_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"status" "deposit_status" NOT NULL,
	"note" text,
	"recorded_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "direct_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"entertainer_profile_id" uuid NOT NULL,
	"requested_by_user_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'Europe/Berlin' NOT NULL,
	"proposed_fee_cents" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"format_category" text NOT NULL,
	"notes" text,
	"response_deadline_at" timestamp with time zone,
	"state" "direct_request_state" DEFAULT 'requested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entertainer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"act_name" text NOT NULL,
	"category" text NOT NULL,
	"genres" text,
	"description" text NOT NULL,
	"group_size" integer NOT NULL,
	"berlin_base" text NOT NULL,
	"travel_radius_km" integer DEFAULT 25 NOT NULL,
	"price_min_cents" integer NOT NULL,
	"price_max_cents" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"duration_minutes" integer NOT NULL,
	"performance_formats" text,
	"technical_requirements" text NOT NULL,
	"languages" text,
	"accessibility_notes" text,
	"equipment_supplied" text,
	"website_url" text,
	"social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"publication_state" "profile_publication_state" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entertainer_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "entertainer_price_range_chk" CHECK ("entertainer_profiles"."price_min_cents" >= 0 AND "entertainer_profiles"."price_max_cents" >= "entertainer_profiles"."price_min_cents")
);
--> statement-breakpoint
CREATE TABLE "marketplace_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"approval_state" "approval_state" DEFAULT 'applied' NOT NULL,
	"application_note" text,
	"berlin_connection" text,
	"terms_accepted_at" timestamp with time zone,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp with time zone,
	"review_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_accounts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"venue_space_id" uuid,
	"created_by_user_id" text NOT NULL,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'Europe/Berlin' NOT NULL,
	"format_category" text NOT NULL,
	"expected_audience" text,
	"budget_min_cents" integer,
	"budget_max_cents" integer,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"act_size_min" integer,
	"act_size_max" integer,
	"production_context" text,
	"application_deadline" timestamp with time zone,
	"notes" text,
	"state" "opportunity_state" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunities_window_chk" CHECK ("opportunities"."ends_at" > "opportunities"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "portfolio_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entertainer_profile_id" uuid NOT NULL,
	"kind" "portfolio_item_kind" NOT NULL,
	"caption" text,
	"alt_text" text,
	"url" text,
	"blob_key" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" text NOT NULL,
	"entertainer_profile_id" uuid,
	"blob_key" text NOT NULL,
	"original_filename" text,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum" text NOT NULL,
	"scan_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agreement_id" uuid NOT NULL,
	"signer_user_id" text NOT NULL,
	"party_role" text NOT NULL,
	"provider_reference" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"signed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"role" "marketplace_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venue_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "venue_membership_role" NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venue_spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"name" text NOT NULL,
	"capacity" integer NOT NULL,
	"stage_dimensions" text,
	"accessibility_notes" text,
	"production_resources" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"short_description" text NOT NULL,
	"address_line1" text NOT NULL,
	"address_line2" text,
	"district" text NOT NULL,
	"postal_code" text NOT NULL,
	"city" text DEFAULT 'Berlin' NOT NULL,
	"country_code" text DEFAULT 'DE' NOT NULL,
	"latitude" text,
	"longitude" text,
	"venue_type" text NOT NULL,
	"audience_description" text NOT NULL,
	"capacity" integer NOT NULL,
	"capacity_context" text,
	"production_resources" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"house_rules" text,
	"load_in_notes" text,
	"accessibility_notes" text,
	"social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"website_url" text,
	"publication_state" "profile_publication_state" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authenticators" ADD CONSTRAINT "authenticators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_booking_terms_id_booking_terms_id_fk" FOREIGN KEY ("booking_terms_id") REFERENCES "public"."booking_terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_clarification_notes" ADD CONSTRAINT "application_clarification_notes_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_clarification_notes" ADD CONSTRAINT "application_clarification_notes_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_entertainer_profile_id_entertainer_profiles_id_fk" FOREIGN KEY ("entertainer_profile_id") REFERENCES "public"."entertainer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_terms" ADD CONSTRAINT "booking_terms_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_terms" ADD CONSTRAINT "booking_terms_proposed_by_user_id_users_id_fk" FOREIGN KEY ("proposed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_terms" ADD CONSTRAINT "booking_terms_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_entertainer_profile_id_entertainer_profiles_id_fk" FOREIGN KEY ("entertainer_profile_id") REFERENCES "public"."entertainer_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_entries" ADD CONSTRAINT "calendar_entries_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_unlocks" ADD CONSTRAINT "contact_unlocks_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_unlocks" ADD CONSTRAINT "contact_unlocks_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_unlocks" ADD CONSTRAINT "contact_unlocks_direct_request_id_direct_requests_id_fk" FOREIGN KEY ("direct_request_id") REFERENCES "public"."direct_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_unlocks" ADD CONSTRAINT "contact_unlocks_unlocked_for_user_id_users_id_fk" FOREIGN KEY ("unlocked_for_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_unlocks" ADD CONSTRAINT "contact_unlocks_contact_method_id_contact_methods_id_fk" FOREIGN KEY ("contact_method_id") REFERENCES "public"."contact_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit_status_events" ADD CONSTRAINT "deposit_status_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit_status_events" ADD CONSTRAINT "deposit_status_events_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_requests" ADD CONSTRAINT "direct_requests_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_requests" ADD CONSTRAINT "direct_requests_entertainer_profile_id_entertainer_profiles_id_fk" FOREIGN KEY ("entertainer_profile_id") REFERENCES "public"."entertainer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_requests" ADD CONSTRAINT "direct_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entertainer_profiles" ADD CONSTRAINT "entertainer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_accounts" ADD CONSTRAINT "marketplace_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_accounts" ADD CONSTRAINT "marketplace_accounts_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_venue_space_id_venue_spaces_id_fk" FOREIGN KEY ("venue_space_id") REFERENCES "public"."venue_spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_entertainer_profile_id_entertainer_profiles_id_fk" FOREIGN KEY ("entertainer_profile_id") REFERENCES "public"."entertainer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_files" ADD CONSTRAINT "rider_files_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_files" ADD CONSTRAINT "rider_files_entertainer_profile_id_entertainer_profiles_id_fk" FOREIGN KEY ("entertainer_profile_id") REFERENCES "public"."entertainer_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_agreement_id_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_signer_user_id_users_id_fk" FOREIGN KEY ("signer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_memberships" ADD CONSTRAINT "venue_memberships_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_memberships" ADD CONSTRAINT "venue_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_spaces" ADD CONSTRAINT "venue_spaces_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agreement_templates_locale_version_uidx" ON "agreement_templates" USING btree ("locale","version");--> statement-breakpoint
CREATE UNIQUE INDEX "agreements_booking_uidx" ON "agreements" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agreements_provider_envelope_uidx" ON "agreements" USING btree ("provider_envelope_id");--> statement-breakpoint
CREATE UNIQUE INDEX "applications_opportunity_entertainer_uidx" ON "applications" USING btree ("opportunity_id","entertainer_profile_id");--> statement-breakpoint
CREATE INDEX "audit_events_subject_idx" ON "audit_events" USING btree ("subject_type","subject_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_terms_booking_version_uidx" ON "booking_terms" USING btree ("booking_id","version");--> statement-breakpoint
CREATE INDEX "bookings_parties_state_idx" ON "bookings" USING btree ("venue_id","entertainer_profile_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_origin_uidx" ON "bookings" USING btree ("origin_type","origin_id");--> statement-breakpoint
CREATE INDEX "calendar_entries_owner_range_idx" ON "calendar_entries" USING btree ("owner_type","owner_id","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "contact_methods_owner_idx" ON "contact_methods" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_methods_owner_kind_uidx" ON "contact_methods" USING btree ("owner_type","owner_id","kind");--> statement-breakpoint
CREATE INDEX "entertainer_profiles_publication_idx" ON "entertainer_profiles" USING btree ("publication_state");--> statement-breakpoint
CREATE INDEX "marketplace_accounts_approval_idx" ON "marketplace_accounts" USING btree ("approval_state");--> statement-breakpoint
CREATE INDEX "opportunities_state_starts_idx" ON "opportunities" USING btree ("state","starts_at");--> statement-breakpoint
CREATE INDEX "portfolio_items_profile_sort_idx" ON "portfolio_items" USING btree ("entertainer_profile_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "signatures_agreement_signer_uidx" ON "signatures" USING btree ("agreement_id","signer_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_user_role_uidx" ON "user_roles" USING btree ("user_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "venue_memberships_venue_user_uidx" ON "venue_memberships" USING btree ("venue_id","user_id");--> statement-breakpoint
CREATE INDEX "venue_memberships_user_idx" ON "venue_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "venues_publication_idx" ON "venues" USING btree ("publication_state");--> statement-breakpoint
CREATE INDEX "venues_district_idx" ON "venues" USING btree ("district");--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "calendar_entries" ADD CONSTRAINT "calendar_entries_confirmed_no_overlap"
EXCLUDE USING gist (
  "owner_type" WITH =,
  "owner_id" WITH =,
  tstzrange("starts_at", "ends_at", '[)') WITH &&
) WHERE ("state" = 'confirmed');