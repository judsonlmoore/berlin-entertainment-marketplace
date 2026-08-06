import { describe, expect, it } from "vitest";
import { buildOnboardingChecklistView } from "./onboarding-checklist";

describe("onboarding checklist", () => {
  it("counts completed steps and detects full completion", () => {
    expect(
      buildOnboardingChecklistView({
        published: true,
        searched: true,
        openedResult: false,
        enquiry: false,
      }),
    ).toMatchObject({
      completedCount: 2,
      totalCount: 4,
      allComplete: false,
    });

    expect(
      buildOnboardingChecklistView({
        published: true,
        searched: true,
        openedResult: true,
        enquiry: true,
      }).allComplete,
    ).toBe(true);
  });
});
