import { describe, expect, it } from "vitest";
import {
  LEGAL_SLUGS,
  getLegalDocument,
  listLegalDocuments,
} from "@/src/lib/legal-content";
import { routing } from "@/src/i18n/routing";

describe("legal content", () => {
  it("loads every slug for both locales with title and body", () => {
    for (const locale of routing.locales) {
      for (const slug of LEGAL_SLUGS) {
        const document = getLegalDocument(slug, locale);
        expect(document.title.trim().length).toBeGreaterThan(0);
        expect(document.lastUpdated.trim().length).toBeGreaterThan(0);
        expect(document.description.trim().length).toBeGreaterThan(0);
        expect(document.body.trim().length).toBeGreaterThan(40);
      }
    }
  });

  it("keeps English and German document counts in parity", () => {
    const docs = listLegalDocuments();
    expect(docs).toHaveLength(LEGAL_SLUGS.length * routing.locales.length);
  });

  it("includes the cookie preference action marker in cookie policies", () => {
    for (const locale of routing.locales) {
      const document = getLegalDocument("cookies", locale);
      expect(document.body).toMatch(/\{\{manage-cookie-preferences:[^}]+\}\}/);
    }
  });
});
