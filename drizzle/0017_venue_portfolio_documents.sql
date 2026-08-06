-- Venue portfolio + documents (XOR owner: entertainer profile OR venue).

ALTER TABLE "portfolio_items" ALTER COLUMN "entertainer_profile_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD COLUMN IF NOT EXISTS "venue_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "portfolio_items"
    ADD CONSTRAINT "portfolio_items_venue_id_venues_id_fk"
    FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_items_venue_sort_idx"
  ON "portfolio_items" USING btree ("venue_id","sort_order");
--> statement-breakpoint
ALTER TABLE "portfolio_items" DROP CONSTRAINT IF EXISTS "portfolio_items_owner_xor_check";
--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_owner_xor_check" CHECK (
  (
    "entertainer_profile_id" IS NOT NULL AND "venue_id" IS NULL
  ) OR (
    "entertainer_profile_id" IS NULL AND "venue_id" IS NOT NULL
  )
);
--> statement-breakpoint

ALTER TABLE "rider_files" ADD COLUMN IF NOT EXISTS "venue_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "rider_files"
    ADD CONSTRAINT "rider_files_venue_id_venues_id_fk"
    FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rider_files_venue_sort_idx"
  ON "rider_files" USING btree ("venue_id","sort_order");
--> statement-breakpoint
-- Drop orphan entertainer FKs without cascade if needed; ensure XOR for rows that have an owner.
UPDATE "rider_files"
SET "entertainer_profile_id" = "entertainer_profile_id"
WHERE "entertainer_profile_id" IS NOT NULL OR "venue_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "rider_files" DROP CONSTRAINT IF EXISTS "rider_files_owner_xor_check";
--> statement-breakpoint
-- Existing rows are entertainer-only; venue_id null is fine with entertainer set.
-- New check allows either owner. Rows with both null are invalid — none expected.
ALTER TABLE "rider_files" ADD CONSTRAINT "rider_files_owner_xor_check" CHECK (
  (
    "entertainer_profile_id" IS NOT NULL AND "venue_id" IS NULL
  ) OR (
    "entertainer_profile_id" IS NULL AND "venue_id" IS NOT NULL
  )
);
