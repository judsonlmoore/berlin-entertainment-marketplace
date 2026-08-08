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
  /** Microsoft Entra ID (Azure AD) application (client) ID. */
  AUTH_MICROSOFT_ENTRA_ID_ID: optionalNonEmpty,
  AUTH_MICROSOFT_ENTRA_ID_SECRET: optionalNonEmpty,
  /**
   * Optional issuer, e.g. `https://login.microsoftonline.com/<tenant>/v2.0/`.
   * Omit to allow any Microsoft account via the common endpoint.
   */
  AUTH_MICROSOFT_ENTRA_ID_ISSUER: optionalNonEmpty,
  /** Server-only Places API (New) key for venue business search / prefill. */
  GOOGLE_PLACES_API_KEY: optionalNonEmpty,
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

export type AuthProviderId = "github" | "google" | "microsoft-entra-id";

export function configuredAuthProviders(): AuthProviderId[] {
  const env = getServerEnv();
  const providers: AuthProviderId[] = [];
  if (env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET) {
    providers.push("github");
  }
  if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
    providers.push("google");
  }
  if (env.AUTH_MICROSOFT_ENTRA_ID_ID && env.AUTH_MICROSOFT_ENTRA_ID_SECRET) {
    providers.push("microsoft-entra-id");
  }
  return providers;
}
