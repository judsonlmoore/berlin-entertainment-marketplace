CREATE TYPE "public"."profile_document_visibility" AS ENUM('marketplace', 'engagement');--> statement-breakpoint
ALTER TABLE "rider_files" ADD COLUMN "title" text DEFAULT 'Technical rider' NOT NULL;--> statement-breakpoint
ALTER TABLE "rider_files" ADD COLUMN "visibility" "profile_document_visibility" DEFAULT 'engagement' NOT NULL;--> statement-breakpoint
ALTER TABLE "rider_files" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "rider_files" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "rider_files_profile_sort_idx" ON "rider_files" USING btree ("entertainer_profile_id","sort_order");
