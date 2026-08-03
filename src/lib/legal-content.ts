import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { type AppLocale, routing } from "@/src/i18n/routing";

export const LEGAL_SLUGS = [
  "privacy",
  "terms",
  "cookies",
  "dpa",
  "sub-processors",
] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export type LegalDocument = {
  slug: LegalSlug;
  locale: AppLocale;
  title: string;
  lastUpdated: string;
  description: string;
  body: string;
};

const CONTENT_DIR = path.join(process.cwd(), "content/legal");

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value);
}

export function getLegalDocument(
  slug: LegalSlug,
  locale: AppLocale,
): LegalDocument {
  const filePath = path.join(CONTENT_DIR, `${slug}.${locale}.md`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing legal document: ${slug}.${locale}.md`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const title = typeof data.title === "string" ? data.title : slug;
  const lastUpdated =
    typeof data.lastUpdated === "string" ? data.lastUpdated : "";
  const description =
    typeof data.description === "string" ? data.description : "";

  return {
    slug,
    locale,
    title,
    lastUpdated,
    description,
    body: content.trim(),
  };
}

export function listLegalDocuments(): LegalDocument[] {
  return routing.locales.flatMap((locale) =>
    LEGAL_SLUGS.map((slug) => getLegalDocument(slug, locale)),
  );
}
