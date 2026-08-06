import { describe, expect, it } from "vitest";
import {
  normalizePostGigSurveyResponse,
  postGigSurveyResponseSchema,
} from "./post-gig-survey";

describe("postGigSurveyResponseSchema", () => {
  it("accepts a valid response and normalizes", () => {
    const parsed = postGigSurveyResponseSchema.safeParse({
      overall: "great",
      improvementText: "Very smooth booking.",
      wouldBookAgain: "yes",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(normalizePostGigSurveyResponse(parsed.data)).toEqual({
      overall: "great",
      improvementText: "Very smooth booking.",
      wouldBookAgain: true,
    });
  });

  it("accepts missing improvementText", () => {
    const parsed = postGigSurveyResponseSchema.safeParse({
      overall: "okay",
      wouldBookAgain: "no",
      improvementText: undefined,
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.improvementText).toBeUndefined();
    expect(normalizePostGigSurveyResponse(parsed.data).wouldBookAgain).toBe(
      false,
    );
  });

  it("rejects invalid overall values", () => {
    const parsed = postGigSurveyResponseSchema.safeParse({
      overall: "meh",
      wouldBookAgain: "yes",
    });

    expect(parsed.success).toBe(false);
  });
});
