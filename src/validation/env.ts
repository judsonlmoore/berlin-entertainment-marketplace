import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

const optionalNonEmpty = z.preprocess(
  emptyToUndefined,
  z.string().min(1).optional(),
);
const optionalFlag = z.preprocess(
  emptyToUndefined,
  z.enum(["true", "false"]).optional(),
);

const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: optionalNonEmpty,
  DATABASE_URL_UNPOOLED: optionalNonEmpty,
  AUTH_SECRET: optionalNonEmpty,
  AUTH_URL: optionalNonEmpty,
  AUTH_TRUST_HOST: optionalFlag,
  AUTH_GITHUB_ID: optionalNonEmpty,
  AUTH_GITHUB_SECRET: optionalNonEmpty,
  AUTH_GOOGLE_ID: optionalNonEmpty,
  AUTH_GOOGLE_SECRET: optionalNonEmpty,
  EMAIL_SERVER: optionalNonEmpty,
  EMAIL_FROM: optionalNonEmpty,
  BLOB_READ_WRITE_TOKEN: optionalNonEmpty,
  ESIGN_PROVIDER: optionalNonEmpty,
  ESIGN_API_KEY: optionalNonEmpty,
  ESIGN_WEBHOOK_SECRET: optionalNonEmpty,
  CRON_SECRET: optionalNonEmpty,
  CALENDAR_SECRETS_KEY: optionalNonEmpty,
  SENTRY_DSN: optionalNonEmpty,
  NEXT_PUBLIC_APP_URL: optionalNonEmpty,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached) {
    return cached;
  }
  cached = serverEnvSchema.parse(process.env);
  return cached;
}

export function hasDatabaseUrl(): boolean {
  return Boolean(getServerEnv().DATABASE_URL);
}

export function configuredAuthProviders(): Array<"github" | "google"> {
  const env = getServerEnv();
  const providers: Array<"github" | "google"> = [];
  if (env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET) {
    providers.push("github");
  }
  if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
    providers.push("google");
  }
  return providers;
}
