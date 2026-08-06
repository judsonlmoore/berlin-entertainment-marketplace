import { describe, expect, it } from "vitest";
import {
  canTransitionOpportunity,
  isOpportunityAcceptingApplications,
  isValidOpportunityWindow,
} from "./opportunity";

describe("opportunity transitions", () => {
  it("allows publishing a draft", () => {
    expect(canTransitionOpportunity("draft", "open")).toBe(true);
  });

  it("allows closing an open opportunity", () => {
    expect(canTransitionOpportunity("open", "closed")).toBe(true);
  });

  it("rejects publishing from closed without reopen", () => {
    expect(canTransitionOpportunity("closed", "cancelled")).toBe(false);
  });
});

describe("application window", () => {
  it("accepts applications only while open and before deadline", () => {
    const now = new Date("2026-08-03T12:00:00Z");
    expect(
      isOpportunityAcceptingApplications(
        "open",
        new Date("2026-08-10T12:00:00Z"),
        now,
      ),
    ).toBe(true);
    expect(
      isOpportunityAcceptingApplications(
        "open",
        new Date("2026-08-01T12:00:00Z"),
        now,
      ),
    ).toBe(false);
    expect(isOpportunityAcceptingApplications("draft", null, now)).toBe(false);
  });
});

describe("opportunity kind window", () => {
  it("requires ends after starts for dated calls", () => {
    const start = new Date("2026-09-01T18:00:00Z");
    const end = new Date("2026-09-01T20:00:00Z");
    expect(
      isValidOpportunityWindow({
        kind: "dated",
        startsAt: start,
        endsAt: end,
      }),
    ).toBe(true);
    expect(
      isValidOpportunityWindow({
        kind: "dated",
        startsAt: start,
        endsAt: start,
      }),
    ).toBe(false);
    expect(
      isValidOpportunityWindow({
        kind: "dated",
        startsAt: null,
        endsAt: null,
      }),
    ).toBe(false);
  });

  it("requires null window for standing calls", () => {
    expect(
      isValidOpportunityWindow({
        kind: "standing",
        startsAt: null,
        endsAt: null,
      }),
    ).toBe(true);
    expect(
      isValidOpportunityWindow({
        kind: "standing",
        startsAt: new Date("2026-09-01T18:00:00Z"),
        endsAt: new Date("2026-09-01T20:00:00Z"),
      }),
    ).toBe(false);
  });
});
