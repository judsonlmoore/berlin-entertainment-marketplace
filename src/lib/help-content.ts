import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { type AppLocale, routing } from "@/src/i18n/routing";

export const HELP_AUDIENCES = ["public", "members"] as const;
export type HelpAudience = (typeof HELP_AUDIENCES)[number];

export type HelpArticle = {
  slug: string;
  locale: AppLocale;
  title: string;
  description: string;
  audience: HelpAudience;
  order: number;
  navGroup: string | null;
  body: string;
};

const CONTENT_DIR = path.join(process.cwd(), "content/help");

function parseAudience(value: unknown): HelpAudience {
  if (value === "members") return "members";
  return "public";
}

function loadArticleFile(slug: string, locale: AppLocale): HelpArticle | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.${locale}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const title = typeof data.title === "string" ? data.title : slug;
  const description =
    typeof data.description === "string" ? data.description : "";
  const order = typeof data.order === "number" ? data.order : 100;
  const navGroup = typeof data.navGroup === "string" ? data.navGroup : null;

  return {
    slug,
    locale,
    title,
    description,
    audience: parseAudience(data.audience),
    order,
    navGroup,
    body: content.trim(),
  };
}

/** All help slugs discovered from the content directory (locale-agnostic). */
export function listHelpSlugs(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const slugs = new Set<string>();
  for (const name of fs.readdirSync(CONTENT_DIR)) {
    const match = /^(.+)\.(en|de)\.md$/.exec(name);
    if (match?.[1]) slugs.add(match[1]);
  }
  return [...slugs].sort();
}

export function getHelpArticle(
  slug: string,
  locale: AppLocale,
): HelpArticle | null {
  return loadArticleFile(slug, locale);
}

export function listHelpArticles(
  locale: AppLocale,
  options?: { audience?: HelpAudience | "all" },
): HelpArticle[] {
  const audience = options?.audience ?? "all";
  const articles = listHelpSlugs()
    .map((slug) => getHelpArticle(slug, locale))
    .filter((article): article is HelpArticle => article != null)
    .filter((article) => {
      if (audience === "all") return true;
      if (audience === "public") return article.audience === "public";
      // members hub shows public + members
      return true;
    })
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  if (audience === "members" || audience === "all") {
    return articles;
  }
  return articles;
}

/** Articles visible on the public help index (public audience only). */
export function listPublicHelpArticles(locale: AppLocale): HelpArticle[] {
  return listHelpSlugs()
    .map((slug) => getHelpArticle(slug, locale))
    .filter((article): article is HelpArticle => article != null)
    .filter((article) => article.audience === "public")
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

/** Articles visible in the member help hub (public + members). */
export function listMemberHelpArticles(locale: AppLocale): HelpArticle[] {
  return listHelpSlugs()
    .map((slug) => getHelpArticle(slug, locale))
    .filter((article): article is HelpArticle => article != null)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export function listAllHelpArticles(): HelpArticle[] {
  return routing.locales.flatMap((locale) =>
    listHelpSlugs()
      .map((slug) => getHelpArticle(slug, locale))
      .filter((article): article is HelpArticle => article != null),
  );
}
