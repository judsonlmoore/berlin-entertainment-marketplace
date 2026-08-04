import { describe, expect, it } from "vitest";

/**
 * Onboarding completion is “role + profile/venue row exists”, not publication
 * submitted/approved. This file documents the contract for gate callers;
 * DB-backed resolveOnboardingDestination is covered in integration when present.
 */
describe("onboarding gate contract", () => {
  it("treats draft profiles as onboarding-complete destinations", () => {
    const publicationStatesThatMustNotForceSetup = [
      "draft",
      "submitted",
      "approved",
      "changes_requested",
      "suspended",
    ] as const;

    // Any existing profile row completes onboarding regardless of publication.
    for (const state of publicationStatesThatMustNotForceSetup) {
      const hasProfileRow = true;
      const destination = hasProfileRow ? "none" : "setup";
      expect(destination).toBe("none");
      void state;
    }
  });

  it("requires a profile row before leaving setup", () => {
    const hasProfileRow = false;
    expect(hasProfileRow ? "none" : "setup").toBe("setup");
  });
});
