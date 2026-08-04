-- Detach identity providers from already-anonymized shells so the same SSO
-- email can create a new user. Future anonymizations delete these in-app.
DELETE FROM "sessions"
WHERE "user_id" IN (
  SELECT "id" FROM "users" WHERE "anonymized_at" IS NOT NULL
);--> statement-breakpoint
DELETE FROM "authenticators"
WHERE "user_id" IN (
  SELECT "id" FROM "users" WHERE "anonymized_at" IS NOT NULL
);--> statement-breakpoint
DELETE FROM "accounts"
WHERE "user_id" IN (
  SELECT "id" FROM "users" WHERE "anonymized_at" IS NOT NULL
);
