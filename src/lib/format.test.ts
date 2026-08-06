import { describe, expect, it } from "vitest";
import { berlinCivilDayWindow } from "./format";

describe("berlinCivilDayWindow", () => {
  it("returns a half-open Berlin civil day", () => {
    const { startsAt, endsAt } = berlinCivilDayWindow("2026-08-06");
    expect(endsAt.getTime()).toBeGreaterThan(startsAt.getTime());
    // 24h-ish (DST can be 23h or 25h)
    const hours = (endsAt.getTime() - startsAt.getTime()) / 3_600_000;
    expect(hours).toBeGreaterThanOrEqual(23);
    expect(hours).toBeLessThanOrEqual(25);
  });

  it("rejects invalid dates", () => {
    expect(() => berlinCivilDayWindow("06-08-2026")).toThrow();
  });
});
