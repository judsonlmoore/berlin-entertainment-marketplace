-- Buyer ownership: 1 account → 1 venue; drop venue_memberships.
-- Orphan venues without an active owner membership are deleted before NOT NULL.

ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "owner_user_id" text;
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "google_place_id" text;
--> statement-breakpoint

-- Prefer active owner membership; if multiple owned venues, keep the newest.
WITH ranked AS (
  SELECT
    vm.venue_id,
    vm.user_id,
    ROW_NUMBER() OVER (
      PARTITION BY vm.user_id
      ORDER BY v.updated_at DESC NULLS LAST, v.created_at DESC NULLS LAST
    ) AS owner_rank
  FROM venue_memberships vm
  INNER JOIN venues v ON v.id = vm.venue_id
  WHERE vm.role = 'owner' AND vm.status = 'active'
)
UPDATE venues v
SET owner_user_id = ranked.user_id
FROM ranked
WHERE v.id = ranked.venue_id AND ranked.owner_rank = 1;
--> statement-breakpoint

-- Extra venues beyond the first per owner (from multi-venue era) lose ownership;
-- delete them after detaching memberships/spaces via cascade.
DELETE FROM venues
WHERE owner_user_id IS NULL
   OR id IN (
     SELECT v.id
     FROM venues v
     INNER JOIN (
       SELECT
         owner_user_id,
         id,
         ROW_NUMBER() OVER (
           PARTITION BY owner_user_id
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         ) AS rn
       FROM venues
       WHERE owner_user_id IS NOT NULL
     ) ranked ON ranked.id = v.id
     WHERE ranked.rn > 1
   );
--> statement-breakpoint

ALTER TABLE "venues" ALTER COLUMN "owner_user_id" SET NOT NULL;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "venues"
    ADD CONSTRAINT "venues_owner_user_id_users_id_fk"
    FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "venues_owner_user_uidx" ON "venues" USING btree ("owner_user_id");
--> statement-breakpoint

DROP TABLE IF EXISTS "venue_memberships";
--> statement-breakpoint

-- Keep at most one space per venue (prefer oldest / Main room).
DELETE FROM venue_spaces
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY venue_id
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM venue_spaces
  ) ranked
  WHERE ranked.rn > 1
);
