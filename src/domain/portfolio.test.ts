import { describe, expect, it } from "vitest";
import {
  isAllowedPortfolioImageMime,
  validatePortfolioImageInput,
  validatePortfolioLinkInput,
  validatePortfolioYouTubeInput,
} from "./portfolio";

describe("portfolio domain", () => {
  it("allows common image types within size limit", () => {
    expect(isAllowedPortfolioImageMime("image/jpeg")).toBe(true);
    expect(
      validatePortfolioImageInput({
        mimeType: "image/png",
        sizeBytes: 1024,
      }).ok,
    ).toBe(true);
  });

  it("rejects oversized images", () => {
    expect(
      validatePortfolioImageInput({
        mimeType: "image/jpeg",
        sizeBytes: 6 * 1024 * 1024,
      }).ok,
    ).toBe(false);
  });

  it("validates external links", () => {
    expect(
      validatePortfolioLinkInput({ url: "https://example.com/gig" }).ok,
    ).toBe(true);
    expect(validatePortfolioLinkInput({ url: "not-a-url" }).ok).toBe(false);
  });

  it("validates YouTube portfolio entries", () => {
    const result = validatePortfolioYouTubeInput({
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    expect(result.ok).toBe(true);
  });
});
