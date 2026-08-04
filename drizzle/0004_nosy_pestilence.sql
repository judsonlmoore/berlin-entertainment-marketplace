CREATE TABLE "cached_external_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"external_uid" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_type" "calendar_owner_type" NOT NULL,
	"owner_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"external_account_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_export_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_type" "calendar_owner_type" NOT NULL,
	"owner_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"label" text,
	"created_by_user_id" text,
	"revoked_at" timestamp with time zone,
	"last_accessed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_recurrence_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_entry_id" uuid NOT NULL,
	"exception_starts_at" timestamp with time zone NOT NULL,
	"kind" text DEFAULT 'skip' NOT NULL,
	"override_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_calendar_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_type" "calendar_owner_type" NOT NULL,
	"owner_id" uuid NOT NULL,
	"label" text NOT NULL,
	"feed_url_ciphertext" text NOT NULL,
	"feed_url_nonce" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_refreshed_at" timestamp with time zone,
	"last_error" text,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_entries" ADD COLUMN "all_day" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_entries" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "calendar_entries" ADD COLUMN "private_note" text;--> statement-breakpoint
ALTER TABLE "calendar_entries" ADD COLUMN "recurrence_rule" text;--> statement-breakpoint
ALTER TABLE "calendar_entries" ADD COLUMN "recurrence_parent_id" uuid;--> statement-breakpoint
ALTER TABLE "cached_external_events" ADD CONSTRAINT "cached_external_events_subscription_id_external_calendar_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."external_calendar_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_export_tokens" ADD CONSTRAINT "calendar_export_tokens_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_recurrence_exceptions" ADD CONSTRAINT "calendar_recurrence_exceptions_parent_entry_id_calendar_entries_id_fk" FOREIGN KEY ("parent_entry_id") REFERENCES "public"."calendar_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_recurrence_exceptions" ADD CONSTRAINT "calendar_recurrence_exceptions_override_entry_id_calendar_entries_id_fk" FOREIGN KEY ("override_entry_id") REFERENCES "public"."calendar_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_calendar_subscriptions" ADD CONSTRAINT "external_calendar_subscriptions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cached_external_events_sub_uid_uidx" ON "cached_external_events" USING btree ("subscription_id","external_uid");--> statement-breakpoint
CREATE INDEX "cached_external_events_range_idx" ON "cached_external_events" USING btree ("subscription_id","starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_connections_owner_provider_uidx" ON "calendar_connections" USING btree ("owner_type","owner_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_export_tokens_hash_uidx" ON "calendar_export_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "calendar_export_tokens_owner_idx" ON "calendar_export_tokens" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_recurrence_exceptions_parent_start_uidx" ON "calendar_recurrence_exceptions" USING btree ("parent_entry_id","exception_starts_at");--> statement-breakpoint
CREATE INDEX "external_calendar_subscriptions_owner_idx" ON "external_calendar_subscriptions" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "calendar_entries_recurrence_parent_idx" ON "calendar_entries" USING btree ("recurrence_parent_id");