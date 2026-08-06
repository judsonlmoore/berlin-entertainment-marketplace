-- Backfill immutable rendered agreement bodies expected by the Drizzle schema.
-- Some environments were bootstrapped from an older baseline that omitted these columns.

ALTER TABLE "agreements" ADD COLUMN IF NOT EXISTS "german_body" text;
--> statement-breakpoint
ALTER TABLE "agreements" ADD COLUMN IF NOT EXISTS "english_body" text;
--> statement-breakpoint
UPDATE "agreements" SET "german_body" = '' WHERE "german_body" IS NULL;
--> statement-breakpoint
UPDATE "agreements" SET "english_body" = '' WHERE "english_body" IS NULL;
--> statement-breakpoint
ALTER TABLE "agreements" ALTER COLUMN "german_body" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "agreements" ALTER COLUMN "english_body" SET NOT NULL;
