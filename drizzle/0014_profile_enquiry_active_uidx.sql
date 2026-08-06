-- At most one active (pending/interested) undated/dated profile enquiry per act↔venue.
CREATE UNIQUE INDEX "profile_enquiries_active_pair_uidx"
ON "profile_enquiries" ("venue_id", "entertainer_profile_id")
WHERE "state" IN ('pending', 'interested');
