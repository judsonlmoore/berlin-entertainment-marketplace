-- Standing open calls: dated windows remain required; standing windows are null.
CREATE TYPE "public"."opportunity_kind" AS ENUM('dated', 'standing');--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "kind" "opportunity_kind" DEFAULT 'dated' NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "standing_schedule" text;--> statement-breakpoint
ALTER TABLE "opportunities" ALTER COLUMN "starts_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunities" ALTER COLUMN "ends_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunities" DROP CONSTRAINT IF EXISTS "opportunities_window_chk";--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_kind_window_chk" CHECK (
  (
    "kind" = 'dated'
    AND "starts_at" IS NOT NULL
    AND "ends_at" IS NOT NULL
    AND "ends_at" > "starts_at"
  )
  OR (
    "kind" = 'standing'
    AND "starts_at" IS NULL
    AND "ends_at" IS NULL
  )
);
