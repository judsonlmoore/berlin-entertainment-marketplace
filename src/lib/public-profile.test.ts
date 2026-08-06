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
        blobKey: "blob/https://example.blob.vercel-storage.com/a.jpg",
        sortOrder: 0,
      },
      {
        id: "img-2",
        kind: "image",
        caption: "Gallery",
        altText: null,
        url: null,
        blobKey: "local/user/b.png",
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

  it("skips legacy pending/ image keys that cannot be served", () => {
    const media = splitPortfolioMedia([
      {
        id: "broken",
        kind: "image",
        caption: "Ghost",
        altText: null,
        url: null,
        blobKey: "pending/user/portfolio/x",
        sortOrder: 0,
      },
      {
        id: "ok",
        kind: "image",
        caption: "Real",
        altText: null,
        url: null,
        blobKey: "blob/https://example.blob.vercel-storage.com/a.jpg",
        sortOrder: 1,
      },
    ]);
    expect(media.hero?.id).toBe("ok");
    expect(media.gallery).toEqual([]);
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
