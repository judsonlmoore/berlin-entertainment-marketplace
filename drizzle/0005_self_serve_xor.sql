CREATE TYPE "public"."account_status" AS ENUM('active', 'suspended');--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "active_role_mode";--> statement-breakpoint
ALTER TABLE "marketplace_accounts" ADD COLUMN "account_status" "account_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
UPDATE "marketplace_accounts" SET "account_status" = 'suspended' WHERE "approval_state" = 'suspended';--> statement-breakpoint
UPDATE "marketplace_accounts" SET "account_status" = 'active' WHERE "approval_state" IS DISTINCT FROM 'suspended';--> statement-breakpoint
ALTER TABLE "marketplace_accounts" DROP COLUMN IF EXISTS "approval_state";--> statement-breakpoint
ALTER TABLE "marketplace_accounts" DROP COLUMN IF EXISTS "application_note";--> statement-breakpoint
DROP INDEX IF EXISTS "marketplace_accounts_approval_idx";--> statement-breakpoint
CREATE INDEX "marketplace_accounts_status_idx" ON "marketplace_accounts" USING btree ("account_status");--> statement-breakpoint
DELETE FROM "user_roles" a USING "user_roles" b WHERE a.ctid < b.ctid AND a.user_id = b.user_id;--> statement-breakpoint
DROP INDEX IF EXISTS "user_roles_user_role_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_user_uidx" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
DROP TYPE IF EXISTS "public"."approval_state";
