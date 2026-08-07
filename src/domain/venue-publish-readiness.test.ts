import { describe, expect, it } from "vitest";
import { checkVenuePublishReadiness } from "./venue-publish-readiness";

const ready = {
  name: "Electric Social",
  shortDescription: `<p>${"a".repeat(50)}</p>`,
  addressLine1: "Weserstraße 1",
  district: "Neukölln",
  postalCode: "12047",
  venueType: "bar|live_music",
  audienceDescription: `<p>${"b".repeat(50)}</p>`,
  capacity: 80,
  legalIdentityComplete: true,
};

describe("checkVenuePublishReadiness", () => {
  it("passes a complete venue", () => {
    expect(checkVenuePublishReadiness(ready).ok).toBe(true);
  });

  it("returns field-specific issues without requiring coordinates", () => {
    const result = checkVenuePublishReadiness({
      ...ready,
      shortDescription: "",
      audienceDescription: "<p></p>",
      district: "  ",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((i) => i.field)).toEqual([
      "shortDescription",
      "district",
      "audienceDescription",
    ]);
    expect(result.issues[0]?.message).toMatch(/Short description/i);
    expect(result.issues.every((i) => !/coordinate/i.test(i.message))).toBe(
      true,
    );
  });

  it("requires complete legal identity", () => {
    const result = checkVenuePublishReadiness({
      ...ready,
      legalIdentityComplete: false,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.field === "legalIdentity")).toBe(true);
  });
});
