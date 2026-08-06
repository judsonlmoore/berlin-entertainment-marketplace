import { describe, expect, it } from "vitest";
import {
  getHelpArticle,
  listHelpSlugs,
  listMemberHelpArticles,
  listPublicHelpArticles,
} from "@/src/lib/help-content";
import { routing } from "@/src/i18n/routing";

const EXPECTED_PUBLIC = [
  "what-is-salon",
  "getting-access",
  "privacy-and-contacts",
] as const;

const EXPECTED_MEMBERS = [
  "publish-your-profile",
  "find-and-contact",
  "bookings-inbox",
  "open-calls",
  "calendar-basics",
  "agreements-and-deposits",
] as const;

describe("help content", () => {
  it("ships the planned bilingual article set", () => {
    const slugs = listHelpSlugs();
    for (const slug of [...EXPECTED_PUBLIC, ...EXPECTED_MEMBERS]) {
      expect(slugs).toContain(slug);
    }
  });

  it("loads every slug for both locales with title and body", () => {
    for (const locale of routing.locales) {
      for (const slug of listHelpSlugs()) {
        const article = getHelpArticle(slug, locale);
        expect(article).not.toBeNull();
        expect(article!.title.trim().length).toBeGreaterThan(0);
        expect(article!.description.trim().length).toBeGreaterThan(0);
        expect(article!.body.trim().length).toBeGreaterThan(40);
        expect(["public", "members"]).toContain(article!.audience);
      }
    }
  });

  it("keeps public indexes to public audience only", () => {
    for (const locale of routing.locales) {
      const publicArticles = listPublicHelpArticles(locale);
      expect(publicArticles.map((a) => a.slug).sort()).toEqual(
        [...EXPECTED_PUBLIC].sort(),
      );
      expect(publicArticles.every((a) => a.audience === "public")).toBe(true);
    }
  });

  it("includes public and member articles in the member hub", () => {
    for (const locale of routing.locales) {
      const memberArticles = listMemberHelpArticles(locale);
      const slugs = memberArticles.map((a) => a.slug);
      for (const slug of [...EXPECTED_PUBLIC, ...EXPECTED_MEMBERS]) {
        expect(slugs).toContain(slug);
      }
    }
  });
});
