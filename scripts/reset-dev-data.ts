/**
 * Wipe non-prod Neon schema + document/portfolio blobs, then re-apply migrations.
 *
 * Usage:
 *   ALLOW_DB_RESET=true npm run db:reset-dev
 *
 * Does NOT seed synthetic demo data. Re-create real accounts via sign-up after.
 */
import { rm } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { list, del } from "@vercel/blob";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function maskDatabaseUrl(url: string): string {
  return url.replace(/:([^:@/]+)@/, ":***@");
}

function looksLikeProductionAppOrigin(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return false;
    }
    // Local LAN / phone testing still allowed.
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

function assertSafeToReset() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to reset: NODE_ENV=production");
  }
  if (process.env.ALLOW_DB_RESET !== "true") {
    throw new Error(
      "Set ALLOW_DB_RESET=true to run the non-prod database wipe",
    );
  }
  // Require an explicit local AUTH_URL so an unset value cannot skip the
  // app-origin guard (README: reset only with AUTH_URL on localhost/LAN).
  const authUrl = process.env.AUTH_URL?.trim();
  if (!authUrl) {
    throw new Error(
      "Set AUTH_URL to a localhost (or LAN) origin before running the wipe",
    );
  }
  if (looksLikeProductionAppOrigin(authUrl)) {
    throw new Error(
      `Refusing to reset: AUTH_URL looks non-local (${authUrl}). Point AUTH_URL at localhost for this wipe.`,
    );
  }
  if (looksLikeProductionAppOrigin(process.env.NEXT_PUBLIC_APP_URL)) {
    throw new Error(
      `Refusing to reset: NEXT_PUBLIC_APP_URL looks non-local (${process.env.NEXT_PUBLIC_APP_URL}).`,
    );
  }
}

async function countRows(
  client: pg.Client,
  table: string,
): Promise<number | null> {
  try {
    const result = await client.query<{ n: string }>(
      `select count(*)::text as n from ${table}`,
    );
    return Number(result.rows[0]?.n ?? 0);
  } catch {
    return null;
  }
}

async function listBlobUrls(prefix: string, token: string): Promise<string[]> {
  const urls: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({
      prefix,
      token,
      ...(cursor ? { cursor } : {}),
      limit: 1000,
    });
    for (const blob of page.blobs) {
      urls.push(blob.url);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return urls;
}

async function wipeRemoteBlobs(token: string) {
  const prefixes = ["documents/", "portfolio/"] as const;
  const allUrls: string[] = [];
  for (const prefix of prefixes) {
    const urls = await listBlobUrls(prefix, token);
    console.log(`blob prefix ${prefix}: ${urls.length} object(s)`);
    allUrls.push(...urls);
  }
  const batchSize = 100;
  for (let i = 0; i < allUrls.length; i += batchSize) {
    const batch = allUrls.slice(i, i + batchSize);
    await del(batch, { token });
    console.log(`deleted blob batch ${i / batchSize + 1} (${batch.length})`);
  }
  console.log(`blob wipe complete: ${allUrls.length} object(s)`);
}

async function wipeLocalDataDirs() {
  for (const rel of [".data/documents", ".data/portfolio"]) {
    const abs = path.join(ROOT, rel);
    try {
      await rm(abs, { recursive: true, force: true });
      console.log(`removed local ${rel}`);
    } catch (error) {
      console.warn(`could not remove ${rel}:`, error);
    }
  }
}

async function main() {
  assertSafeToReset();

  const databaseUrl =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED is required");
  }

  console.log("target database:", maskDatabaseUrl(databaseUrl));
  console.log("AUTH_URL:", process.env.AUTH_URL ?? "(unset)");

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const users = await countRows(client, "users");
    const entertainers = await countRows(client, "entertainer_profiles");
    const venues = await countRows(client, "venues");
    const bookings = await countRows(client, "bookings");
    console.log("pre-wipe counts:", {
      users,
      entertainer_profiles: entertainers,
      venues,
      bookings,
    });

    console.log("dropping schema public cascade…");
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    // drizzle-kit stores the migration journal outside public; drop it too
    // or migrate becomes a no-op against an empty database.
    await client.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await client.query("CREATE SCHEMA public");
    await client.query("GRANT ALL ON SCHEMA public TO public");
    await client.query("GRANT ALL ON SCHEMA public TO CURRENT_USER");
    // Neon roles commonly need this for subsequent app connections.
    await client.query(
      `DO $$ BEGIN
         IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'neondb_owner') THEN
           EXECUTE 'GRANT ALL ON SCHEMA public TO neondb_owner';
         END IF;
       END $$`,
    );
    console.log("schema public recreated (drizzle journal cleared)");
  } finally {
    await client.end();
  }

  console.log("running drizzle migrations…");
  const migrate = spawnSync(
    "node",
    [
      "--env-file=.env",
      "./node_modules/drizzle-kit/bin.cjs",
      "migrate",
      "--config=drizzle.config.ts",
    ],
    {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    },
  );
  if (migrate.status !== 0) {
    throw new Error(`drizzle-kit migrate failed with status ${migrate.status}`);
  }

  const verify = new pg.Client({ connectionString: databaseUrl });
  await verify.connect();
  try {
    const users = await countRows(verify, "users");
    const entertainers = await countRows(verify, "entertainer_profiles");
    console.log("post-migrate counts:", {
      users,
      entertainer_profiles: entertainers,
    });
    if (users === null || entertainers === null) {
      throw new Error(
        "Expected users and entertainer_profiles tables after migrate",
      );
    }
    if (users !== 0 || entertainers !== 0) {
      throw new Error(
        "Expected empty users and entertainer_profiles after reset",
      );
    }
  } finally {
    await verify.end();
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (blobToken) {
    console.log("wiping Vercel Blob documents/ and portfolio/…");
    await wipeRemoteBlobs(blobToken);
  } else {
    console.log("BLOB_READ_WRITE_TOKEN unset — wiping local .data dirs only");
  }
  await wipeLocalDataDirs();

  console.log(`
Reset complete.
Next steps:
  1. Sign up again for your real accounts at /sign-in
  2. Complete role selection / onboarding
  3. Optional staff: npx tsx --env-file=.env scripts/set-staff.ts you@example.com
Do NOT run db:seed unless you want synthetic mock entertainers/venues again.
`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
