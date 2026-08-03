import { describe, expect, it } from "vitest";
import {
  canTransitionOpportunity,
  isOpportunityAcceptingApplications,
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
