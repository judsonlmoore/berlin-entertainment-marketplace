import { describe, expect, it } from "vitest";
import { checkEntertainerPublishReadiness } from "./entertainer-publish-readiness";

const ready = {
  actName: "Drumson",
  category: "music",
  genres: "jazz",
  description: `<p>${"a".repeat(50)}</p>`,
  groupSize: 1,
  berlinBase: "Berlin, Germany",
  travelRadiusKm: 25,
  priceMinCents: 10000,
  priceMaxCents: 25000,
  websiteUrl: "https://example.com",
  socialLinks: null,
  imageCount: 1,
  hasExternalOrVideoLink: false,
  legalIdentityComplete: true,
};

describe("checkEntertainerPublishReadiness", () => {
  it("passes a complete profile", () => {
    expect(checkEntertainerPublishReadiness(ready).ok).toBe(true);
  });

  it("requires a photo and a public link", () => {
    const noPhoto = checkEntertainerPublishReadiness({
      ...ready,
      imageCount: 0,
      websiteUrl: null,
      socialLinks: {},
      hasExternalOrVideoLink: false,
    });
    expect(noPhoto.ok).toBe(false);
    if (!noPhoto.ok) {
      expect(noPhoto.reasons.some((r) => /photo/i.test(r))).toBe(true);
      expect(noPhoto.reasons.some((r) => /link/i.test(r))).toBe(true);
    }
  });

  it("accepts a social or video link instead of website", () => {
    expect(
      checkEntertainerPublishReadiness({
        ...ready,
        websiteUrl: null,
        socialLinks: { instagram: "https://instagram.com/x" },
      }).ok,
    ).toBe(true);
    expect(
      checkEntertainerPublishReadiness({
        ...ready,
        websiteUrl: null,
        socialLinks: {},
        hasExternalOrVideoLink: true,
      }).ok,
    ).toBe(true);
  });

  it("requires complete legal identity", () => {
    const result = checkEntertainerPublishReadiness({
      ...ready,
      legalIdentityComplete: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.reasons.some((r) => /legal and payment identity/i.test(r)),
      ).toBe(true);
    }
  });
});
