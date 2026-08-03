import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDb>;

function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

let cached: Database | undefined;

/**
 * Lazy Neon/Drizzle client. Safe to import at build time; throws only when used
 * without DATABASE_URL.
 */
export function getDb(): Database {
  if (cached) {
    return cached;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  cached = createDb(databaseUrl);
  return cached;
}
