import { describe, expect, it } from "vitest";
import {
  socialLinksToList,
  splitPortfolioMedia,
} from "@/src/lib/public-profile";

describe("splitPortfolioMedia", () => {
  it("treats the first image as hero and keeps the rest as gallery", () => {
    const media = splitPortfolioMedia([
      {
        id: "img-1",
        kind: "image",
        caption: "Hero",
        altText: null,
        url: null,
        sortOrder: 0,
      },
      {
        id: "img-2",
        kind: "image",
        caption: "Gallery",
        altText: null,
        url: null,
        sortOrder: 1,
      },
      {
        id: "yt-1",
        kind: "youtube",
        caption: null,
        altText: null,
        url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
        sortOrder: 2,
      },
      {
        id: "link-1",
        kind: "link",
        caption: "Press",
        altText: null,
        url: "https://example.com",
        sortOrder: 3,
      },
    ]);
    expect(media.hero?.id).toBe("img-1");
    expect(media.gallery.map((i) => i.id)).toEqual(["img-2"]);
    expect(media.youtube?.id).toBe("yt-1");
    expect(media.links).toHaveLength(1);
  });
});

describe("socialLinksToList", () => {
  it("orders known networks and skips empties", () => {
    const list = socialLinksToList(
      { youtube: "https://youtube.com/@x", instagram: "https://instagram.com/x" },
      (key) => key,
    );
    expect(list.map((l) => l.label)).toEqual(["instagram", "youtube"]);
  });
});
