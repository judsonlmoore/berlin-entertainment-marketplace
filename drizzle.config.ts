import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit migrate/studio use TCP via `pg` (devDependency). Prefer the
 * Neon unpooled URL so kit does not select `@neondatabase/serverless` and
 * emit the websocket warning. Runtime app queries still use neon-serverless.
 */
export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.DATABASE_URL ??
      "postgresql://localhost:5432/salon_dev",
  },
  strict: true,
  verbose: true,
});
