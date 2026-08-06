import { describe, expect, it } from "vitest";
import { isSupportSubjectStillValid } from "@/src/lib/support-entity";

describe("isSupportSubjectStillValid", () => {
  it("accepts when resolved owner matches cookie subject", () => {
    expect(
      isSupportSubjectStillValid({
        cookieSubjectUserId: "member-1",
        resolved: { subjectUserId: "member-1", label: "Act" },
      }),
    ).toBe(true);
  });

  it("rejects when entity is gone", () => {
    expect(
      isSupportSubjectStillValid({
        cookieSubjectUserId: "member-1",
        resolved: null,
      }),
    ).toBe(false);
  });

  it("rejects when ownership moved to another user", () => {
    expect(
      isSupportSubjectStillValid({
        cookieSubjectUserId: "member-1",
        resolved: { subjectUserId: "member-2", label: "Venue" },
      }),
    ).toBe(false);
  });
});
