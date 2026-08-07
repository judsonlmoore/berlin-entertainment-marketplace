-- Negotiations / contract package: legal identity, booking docs, addenda, invoices

CREATE TYPE "public"."legal_entity_type" AS ENUM('individual', 'freelancer', 'registered_business');
--> statement-breakpoint
CREATE TYPE "public"."booking_invoice_status" AS ENUM('draft', 'generated', 'failed');
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "account_legal_identities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "entity_type" "legal_entity_type" DEFAULT 'individual' NOT NULL,
  "legal_name" text DEFAULT '' NOT NULL,
  "trading_name" text,
  "address_line1" text DEFAULT '' NOT NULL,
  "address_line2" text,
  "postal_code" text DEFAULT '' NOT NULL,
  "city" text DEFAULT '' NOT NULL,
  "country_code" text DEFAULT 'DE' NOT NULL,
  "tax_id" text,
  "company_register_id" text,
  "invoice_email" text DEFAULT '' NOT NULL,
  "iban" text,
  "bic" text,
  "payment_note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "account_legal_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "account_legal_identities_user_id_unique" ON "account_legal_identities" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_legal_identities_user_idx" ON "account_legal_identities" USING btree ("user_id");
--> statement-breakpoint

ALTER TABLE "agreements" ADD COLUMN IF NOT EXISTS "addenda_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "agreements" ADD COLUMN IF NOT EXISTS "legal_identity_snapshot" jsonb;
--> statement-breakpoint

ALTER TABLE "rider_files" ADD COLUMN IF NOT EXISTS "booking_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "rider_files"
    ADD CONSTRAINT "rider_files_booking_id_bookings_id_fk"
    FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rider_files_booking_sort_idx"
  ON "rider_files" USING btree ("booking_id","sort_order");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "booking_invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "booking_id" uuid NOT NULL,
  "status" "booking_invoice_status" DEFAULT 'draft' NOT NULL,
  "format" text DEFAULT 'sandbox_pdf' NOT NULL,
  "blob_key" text,
  "seller_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "buyer_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "validation_notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "booking_invoices_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_invoices_booking_idx" ON "booking_invoices" USING btree ("booking_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "booking_invoices_booking_uidx" ON "booking_invoices" USING btree ("booking_id");
