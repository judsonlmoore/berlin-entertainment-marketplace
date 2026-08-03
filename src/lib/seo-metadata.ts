import type { Metadata } from "next";
import { routing, type AppLocale } from "@/src/i18n/routing";

const BRAND_NAME = "Salon";

type PublicMetadataInput = {
  locale: AppLocale;
  title: string;
  description: string;
  /** App path without locale prefix, e.g. `/apply`. Omit on layout defaults. */
  path?: string;
  keywords?: string[];
};

type PrivateMetadataInput = {
  locale: AppLocale;
  title: string;
  description?: string;
};

export function formatPageTitle(pageName: string): string {
  return `${pageName} | ${BRAND_NAME}`;
}

function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) {
    return configured;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

function normalizePath(path: string): string {
  if (!path || path === "/") {
    return "/";
  }
  return path.startsWith("/") ? path : `/${path}`;
}

function localePathFor(locale: AppLocale, path: string): string {
  const normalized = normalizePath(path);
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}

/** Indexable metadata for public routes. Never pass user-specific or private data. */
export function buildPublicMetadata({
  locale,
  title,
  description,
  path,
  keywords,
}: PublicMetadataInput): Metadata {
  const metadata: Metadata = {
    title: formatPageTitle(title),
    description,
    keywords: keywords?.length ? keywords : undefined,
    robots: { index: true, follow: true },
  };

  if (path !== undefined) {
    const siteUrl = getSiteUrl();
    const normalizedPath = normalizePath(path);
    metadata.alternates = {
      canonical: `${siteUrl}${localePathFor(locale, normalizedPath)}`,
      languages: Object.fromEntries(
        routing.locales.map((loc) => [
          loc,
          `${siteUrl}${localePathFor(loc, normalizedPath)}`,
        ]),
      ),
    };
  }

  return metadata;
}

/** Descriptive titles for authenticated and auth routes; always noindex/nofollow. */
export function buildPrivateMetadata({
  title,
  description,
}: PrivateMetadataInput): Metadata {
  return {
    title: formatPageTitle(title),
    description,
    robots: { index: false, follow: false },
  };
}
