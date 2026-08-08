import { describe, expect, it } from "vitest";
import {
  ENTERTAINER_WIZARD_STEPS,
  VENUE_WIZARD_STEPS,
  wizardChapters,
  wizardStepsForRole,
} from "@/src/domain/onboarding-wizard-steps";

describe("onboarding wizard steps", () => {
  it("ends with go_live publish for both roles", () => {
    expect(ENTERTAINER_WIZARD_STEPS.at(-1)?.id).toBe("go_live");
    expect(VENUE_WIZARD_STEPS.at(-1)?.id).toBe("go_live");
  });

  it("starts with combined basics before skippable steps", () => {
    const talent = wizardStepsForRole("entertainer");
    expect(talent[0]?.id).toBe("basics");
    expect(talent[0]?.required).toBe(true);
    expect(talent[0]?.skippable).toBe(false);
    const skipIdx = talent.findIndex((s) => s.skippable);
    expect(skipIdx).toBeGreaterThan(0);
  });

  it("has three chapters", () => {
    expect(wizardChapters(ENTERTAINER_WIZARD_STEPS)).toEqual(["A", "B", "C"]);
    expect(wizardChapters(VENUE_WIZARD_STEPS)).toEqual(["A", "B", "C"]);
  });
});
