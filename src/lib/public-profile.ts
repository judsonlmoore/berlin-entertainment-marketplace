import type { PortfolioDiscoveryItem } from "@/src/db/queries/discovery";

export type PublicProfileMedia = {
  hero: PortfolioDiscoveryItem | null;
  gallery: PortfolioDiscoveryItem[];
  youtube: PortfolioDiscoveryItem | null;
  links: PortfolioDiscoveryItem[];
};

/** Split portfolio into hero (first image), gallery, youtube, and external links. */
export function splitPortfolioMedia(
  items: readonly PortfolioDiscoveryItem[] | null | undefined,
): PublicProfileMedia {
  const list = items ?? [];
  const images = list.filter((item) => item.kind === "image");
  const youtube = list.find((item) => item.kind === "youtube") ?? null;
  const links = list.filter((item) => item.kind === "link");
  const [hero = null, ...gallery] = images;
  return { hero, gallery, youtube, links };
}

export type PublicProfileFact = {
  label: string;
  value: string;
};

export type PublicProfileLink = {
  label: string;
  href: string;
};

const SOCIAL_ORDER = [
  "instagram",
  "facebook",
  "tiktok",
  "spotify",
  "soundcloud",
  "linkedin",
  "youtube",
] as const;

export function socialLinksToList(
  socialLinks: Record<string, string> | null | undefined,
  labelFor: (key: string) => string,
): PublicProfileLink[] {
  if (!socialLinks) return [];
  const out: PublicProfileLink[] = [];
  for (const key of SOCIAL_ORDER) {
    const href = socialLinks[key]?.trim();
    if (href) out.push({ label: labelFor(key), href });
  }
  for (const [key, href] of Object.entries(socialLinks)) {
    if ((SOCIAL_ORDER as readonly string[]).includes(key)) continue;
    const trimmed = href?.trim();
    if (trimmed) out.push({ label: labelFor(key), href: trimmed });
  }
  return out;
}
