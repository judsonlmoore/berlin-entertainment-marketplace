import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// Node 22+ provides global WebSocket; keep an explicit assignment for clarity.
if (typeof globalThis.WebSocket !== "undefined") {
  neonConfig.webSocketConstructor = globalThis.WebSocket;
}

export type Database = ReturnType<typeof createDb>;

function createDb(databaseUrl: string) {
  // neon-serverless Pool supports transactions (unlike neon-http).
  const pool = new Pool({ connectionString: databaseUrl });
  return drizzle(pool, { schema });
}

let cached: Database | undefined;

/**
 * Lazy Neon/Drizzle client. Safe to import at build time; throws only when used
 * without DATABASE_URL. Uses the WebSocket driver so booking/onboarding
 * transactions work on Neon.
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
