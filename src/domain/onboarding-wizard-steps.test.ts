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

  it("requires name before skippable steps", () => {
    const talent = wizardStepsForRole("entertainer");
    const nameIdx = talent.findIndex((s) => s.id === "act_name");
    const skipIdx = talent.findIndex((s) => s.skippable);
    expect(nameIdx).toBeGreaterThanOrEqual(0);
    expect(skipIdx).toBeGreaterThan(nameIdx);
    expect(talent[nameIdx]?.required).toBe(true);
    expect(talent[nameIdx]?.skippable).toBe(false);
  });

  it("has three chapters", () => {
    expect(wizardChapters(ENTERTAINER_WIZARD_STEPS)).toEqual(["A", "B", "C"]);
    expect(wizardChapters(VENUE_WIZARD_STEPS)).toEqual(["A", "B", "C"]);
  });
});
