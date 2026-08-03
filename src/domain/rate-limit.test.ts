import { describe, expect, it, beforeEach } from "vitest";
import { AppError } from "./errors";
import { checkRateLimit, resetRateLimitsForTests } from "./rate-limit";

describe("rate limit", () => {
  beforeEach(() => {
    resetRateLimitsForTests();
  });

  it("allows requests within the sliding window", () => {
    const config = { key: "apply:user-1", limit: 2, windowMs: 60_000 };
    expect(() => checkRateLimit(config, 1_000)).not.toThrow();
    expect(() => checkRateLimit(config, 2_000)).not.toThrow();
  });

  it("fails closed when the limit is exceeded", () => {
    const config = { key: "apply:user-2", limit: 1, windowMs: 60_000 };
    checkRateLimit(config, 1_000);
    expect(() => checkRateLimit(config, 2_000)).toThrow(AppError);
    try {
      checkRateLimit(config, 2_000);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("forbidden");
    }
  });

  it("expires timestamps outside the window", () => {
    const config = { key: "apply:user-3", limit: 1, windowMs: 1_000 };
    checkRateLimit(config, 1_000);
    expect(() => checkRateLimit(config, 2_500)).not.toThrow();
  });
});
