-- Align existing databases with the #8 schema squash rename (value_encrypted → value).
-- Fresh installs already create contact_methods.value via 0000_salon_baseline.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contact_methods'
      AND column_name = 'value_encrypted'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contact_methods'
      AND column_name = 'value'
  ) THEN
    ALTER TABLE "contact_methods" RENAME COLUMN "value_encrypted" TO "value";
  END IF;
END $$;
