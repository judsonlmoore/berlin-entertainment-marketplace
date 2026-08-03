import { describe, expect, it } from "vitest";
import {
  canManuallySetCalendarState,
  isBlockingCalendarState,
  isExpiredHold,
  isHoldBlocking,
  rangesOverlap,
} from "./calendar";

describe("calendar domain", () => {
  it("expires holds so they stop blocking", () => {
    const now = new Date("2026-08-03T12:00:00.000Z");
    expect(
      isHoldBlocking(
        "tentative_hold",
        new Date("2026-08-03T11:00:00.000Z"),
        now,
      ),
    ).toBe(false);
    expect(
      isHoldBlocking(
        "tentative_hold",
        new Date("2026-08-03T13:00:00.000Z"),
        now,
      ),
    ).toBe(true);
    expect(
      isExpiredHold(
        "tentative_hold",
        new Date("2026-08-03T11:00:00.000Z"),
        now,
      ),
    ).toBe(true);
  });

  it("treats confirmed and requested as blocking", () => {
    expect(isBlockingCalendarState("confirmed", null)).toBe(true);
    expect(isBlockingCalendarState("requested", null)).toBe(true);
    expect(isBlockingCalendarState("available", null)).toBe(false);
  });

  it("detects overlapping windows", () => {
    expect(
      rangesOverlap(
        new Date("2026-08-03T18:00:00.000Z"),
        new Date("2026-08-03T20:00:00.000Z"),
        new Date("2026-08-03T19:00:00.000Z"),
        new Date("2026-08-03T21:00:00.000Z"),
      ),
    ).toBe(true);
    expect(
      rangesOverlap(
        new Date("2026-08-03T18:00:00.000Z"),
        new Date("2026-08-03T19:00:00.000Z"),
        new Date("2026-08-03T19:00:00.000Z"),
        new Date("2026-08-03T20:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("limits manual edits to availability/hold states", () => {
    expect(canManuallySetCalendarState("available")).toBe(true);
    expect(canManuallySetCalendarState("confirmed")).toBe(false);
  });
});
