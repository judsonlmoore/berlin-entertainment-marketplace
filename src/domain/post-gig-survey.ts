import { z } from "zod";

export const postGigSurveyResponseSchema = z.object({
  overall: z.enum(["great", "okay", "bad"]),
  improvementText: z.string().trim().min(1).max(2000).optional(),
  wouldBookAgain: z.enum(["yes", "no"]),
});

export type PostGigSurveyResponseInput = z.infer<
  typeof postGigSurveyResponseSchema
>;

export function normalizePostGigSurveyResponse(
  response: PostGigSurveyResponseInput,
) {
  return {
    overall: response.overall,
    improvementText: response.improvementText ?? undefined,
    wouldBookAgain: response.wouldBookAgain === "yes",
  };
}

