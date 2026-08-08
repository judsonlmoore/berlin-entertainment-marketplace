ALTER TABLE "agreements" ADD COLUMN "package_pdf_blob_key" text;
--> statement-breakpoint
ALTER TABLE "agreements" ADD COLUMN "package_fingerprint" text;
--> statement-breakpoint
ALTER TABLE "agreements" ADD COLUMN "package_page_count" integer;
--> statement-breakpoint
ALTER TABLE "signatures" ADD COLUMN "confirmation_phrase" text;
