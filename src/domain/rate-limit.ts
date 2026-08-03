import { AppError } from "./errors";

type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();

export type RateLimitConfig = {
  key: string;
  limit: number;
  windowMs: number;
};

export function checkRateLimit(config: RateLimitConfig, now = Date.now()): void {
  const bucket = buckets.get(config.key) ?? { timestamps: [] };
  const windowStart = now - config.windowMs;
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > windowStart);

  if (bucket.timestamps.length >= config.limit) {
    throw new AppError("forbidden", "Too many requests; try again later");
  }

  bucket.timestamps.push(now);
  buckets.set(config.key, bucket);
}

export function rateLimitKey(scope: string, actorId: string): string {
  return `${scope}:${actorId}`;
}

/** Test helper — clears in-memory counters between unit tests. */
export function resetRateLimitsForTests(): void {
  buckets.clear();
}
