import { describe, expect, it } from "vitest";
import { toPrivacyEmbedUrl, validateYouTubeUrl } from "./youtube";

describe("youtube domain", () => {
  it("accepts common watch URLs", () => {
    const result = validateYouTubeUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.videoId).toBe("dQw4w9WgXcQ");
    }
  });

  it("accepts youtu.be links", () => {
    const result = validateYouTubeUrl("https://youtu.be/dQw4w9WgXcQ");
    expect(result.ok).toBe(true);
  });

  it("rejects non-YouTube hosts", () => {
    expect(
      validateYouTubeUrl("https://example.com/watch?v=dQw4w9WgXcQ").ok,
    ).toBe(false);
  });

  it("builds nocookie embed URLs", () => {
    expect(toPrivacyEmbedUrl("dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  });
});
