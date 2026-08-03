ALTER TYPE "public"."approval_state" ADD VALUE IF NOT EXISTS 'rejected';--> statement-breakpoint
ALTER TYPE "public"."application_state" ADD VALUE IF NOT EXISTS 'draft';--> statement-breakpoint
ALTER TYPE "public"."application_state" ADD VALUE IF NOT EXISTS 'clarification_requested';--> statement-breakpoint
ALTER TYPE "public"."direct_request_state" ADD VALUE IF NOT EXISTS 'changes_proposed';--> statement-breakpoint
CREATE TYPE "public"."portfolio_item_kind" AS ENUM('image', 'link', 'youtube');--> statement-breakpoint
CREATE TYPE "public"."calendar_sync_provider" AS ENUM('google', 'microsoft', 'ical');--> statement-breakpoint
CREATE TYPE "public"."calendar_sync_status" AS ENUM('disconnected', 'connected', 'error');--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "house_rules" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "load_in_notes" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "accessibility_notes" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "social_links" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "venue_spaces" ADD COLUMN IF NOT EXISTS "stage_dimensions" text;--> statement-breakpoint
ALTER TABLE "venue_spaces" ADD COLUMN IF NOT EXISTS "accessibility_notes" text;--> statement-breakpoint
ALTER TABLE "entertainer_profiles" ADD COLUMN IF NOT EXISTS "genres" text;--> statement-breakpoint
ALTER TABLE "entertainer_profiles" ADD COLUMN IF NOT EXISTS "performance_formats" text;--> statement-breakpoint
ALTER TABLE "entertainer_profiles" ADD COLUMN IF NOT EXISTS "languages" text;--> statement-breakpoint
ALTER TABLE "entertainer_profiles" ADD COLUMN IF NOT EXISTS "accessibility_notes" text;--> statement-breakpoint
ALTER TABLE "entertainer_profiles" ADD COLUMN IF NOT EXISTS "equipment_supplied" text;--> statement-breakpoint
ALTER TABLE "entertainer_profiles" ADD COLUMN IF NOT EXISTS "website_url" text;--> statement-breakpoint
ALTER TABLE "entertainer_profiles" ADD COLUMN IF NOT EXISTS "social_links" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "direct_requests" ADD COLUMN IF NOT EXISTS "response_deadline_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rider_files" ADD COLUMN IF NOT EXISTS "original_filename" text;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_clarification_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"author_user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_items" (
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
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"owner_type" "calendar_owner_type" NOT NULL,
	"owner_id" uuid NOT NULL,
	"provider" "calendar_sync_provider" NOT NULL,
	"status" "calendar_sync_status" DEFAULT 'disconnected' NOT NULL,
	"external_account_label" text,
	"last_sync_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "application_clarification_notes" ADD CONSTRAINT "application_clarification_notes_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "application_clarification_notes" ADD CONSTRAINT "application_clarification_notes_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_entertainer_profile_id_entertainer_profiles_id_fk" FOREIGN KEY ("entertainer_profile_id") REFERENCES "public"."entertainer_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_items_profile_sort_idx" ON "portfolio_items" USING btree ("entertainer_profile_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_connections_owner_provider_uidx" ON "calendar_connections" USING btree ("owner_type","owner_id","provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_connections_user_idx" ON "calendar_connections" USING btree ("user_id");
