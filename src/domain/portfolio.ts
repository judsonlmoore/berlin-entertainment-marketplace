import { validateYouTubeUrl } from "./youtube";

export const PORTFOLIO_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const PORTFOLIO_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
/** Max gallery images (hero = first after sort). */
export const PORTFOLIO_MAX_IMAGES = 7;
/** Exactly one YouTube embed slot is supported in the profile builder. */
export const PORTFOLIO_MAX_YOUTUBE = 1;
/** Legacy mixed-item ceiling (images + youtube + optional links). */
export const PORTFOLIO_MAX_ITEMS =
  PORTFOLIO_MAX_IMAGES + PORTFOLIO_MAX_YOUTUBE + 8;
export const PORTFOLIO_LINK_MAX_LENGTH = 500;
export const PORTFOLIO_CAPTION_MAX_LENGTH = 500;
export const PORTFOLIO_ALT_MAX_LENGTH = 500;

export type PortfolioItemKind = "image" | "link" | "youtube";

export function isAllowedPortfolioImageMime(mimeType: string): boolean {
  return (PORTFOLIO_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function isAllowedPortfolioImageSize(sizeBytes: number): boolean {
  return (
    Number.isFinite(sizeBytes) &&
    sizeBytes > 0 &&
    sizeBytes <= PORTFOLIO_IMAGE_MAX_BYTES
  );
}

export function validatePortfolioLinkInput(input: {
  url: string;
  caption?: string;
}): { ok: true; url: string } | { ok: false; reason: string } {
  const url = input.url.trim();
  if (!url) {
    return { ok: false, reason: "Link URL is required" };
  }
  if (url.length > PORTFOLIO_LINK_MAX_LENGTH) {
    return { ok: false, reason: "Link URL is too long" };
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { ok: false, reason: "Link must use http or https" };
    }
  } catch {
    return { ok: false, reason: "Invalid link URL" };
  }
  if ((input.caption?.length ?? 0) > PORTFOLIO_CAPTION_MAX_LENGTH) {
    return { ok: false, reason: "Caption is too long" };
  }
  return { ok: true, url };
}

export function validatePortfolioYouTubeInput(input: {
  url: string;
  caption?: string;
}): { ok: true; url: string; videoId: string } | { ok: false; reason: string } {
  const check = validateYouTubeUrl(input.url);
  if (!check.ok) {
    return check;
  }
  if ((input.caption?.length ?? 0) > PORTFOLIO_CAPTION_MAX_LENGTH) {
    return { ok: false, reason: "Caption is too long" };
  }
  return { ok: true, url: check.canonicalUrl, videoId: check.videoId };
}

export function validatePortfolioImageInput(input: {
  mimeType: string;
  sizeBytes: number;
  caption?: string;
  altText?: string;
}): { ok: true } | { ok: false; reason: string } {
  if (!isAllowedPortfolioImageMime(input.mimeType)) {
    return { ok: false, reason: "Only JPEG, PNG, or WebP images are allowed" };
  }
  if (!isAllowedPortfolioImageSize(input.sizeBytes)) {
    return { ok: false, reason: "Image exceeds 5MB limit" };
  }
  if ((input.caption?.length ?? 0) > PORTFOLIO_CAPTION_MAX_LENGTH) {
    return { ok: false, reason: "Caption is too long" };
  }
  if ((input.altText?.length ?? 0) > PORTFOLIO_ALT_MAX_LENGTH) {
    return { ok: false, reason: "Alt text is too long" };
  }
  return { ok: true };
}
