import { parseSubcategory } from "@/src/domain/profile-taxonomy";
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  richTextPlainLength,
  sanitizePlainText,
  validateRichTextField,
} from "@/src/domain/sanitize-input";

export const ACT_NAME_MIN = 2;
export const ACT_NAME_MAX = 160;

export type EntertainerPublishSnapshot = {
  actName: string;
  category: string;
  genres: string | null;
  description: string;
  groupSize: number;
  berlinBase: string;
  travelRadiusKm: number;
  priceMinCents: number;
  priceMaxCents: number;
  websiteUrl: string | null;
  socialLinks: Record<string, string> | null;
  imageCount: number;
  hasExternalOrVideoLink: boolean;
  /** Required to appear in the marketplace; private until terms are agreed. */
  legalIdentityComplete: boolean;
};

export type PublishReadinessResult =
  { ok: true } | { ok: false; reasons: string[] };

function hasPublicUrl(snapshot: EntertainerPublishSnapshot): boolean {
  if (snapshot.websiteUrl?.trim()) return true;
  if (snapshot.hasExternalOrVideoLink) return true;
  const links = snapshot.socialLinks ?? {};
  return Object.values(links).some((value) => Boolean(value?.trim()));
}

/**
 * Built-in QA gate for self-serve talent publish (no staff review).
 */
export function checkEntertainerPublishReadiness(
  snapshot: EntertainerPublishSnapshot,
): PublishReadinessResult {
  const reasons: string[] = [];

  const nameCheck = sanitizePlainText(snapshot.actName, {
    min: ACT_NAME_MIN,
    max: ACT_NAME_MAX,
  });
  if (!nameCheck.ok) {
    reasons.push("Add an act name that meets the character requirements.");
  }

  if (!snapshot.category.trim() || snapshot.category === "uncategorized") {
    reasons.push("Choose a category.");
  }

  const sub = parseSubcategory(snapshot.genres);
  if (!sub.subcategoryId.trim()) {
    reasons.push("Choose a subcategory.");
  } else if (sub.subcategoryId === "other" && !sub.otherLabel.trim()) {
    reasons.push("Describe your subcategory.");
  }

  const descriptionCheck = validateRichTextField(snapshot.description, {
    min: DESCRIPTION_MIN,
    max: DESCRIPTION_MAX,
  });
  if (!descriptionCheck.ok) {
    reasons.push(
      `Description needs ${DESCRIPTION_MIN}–${DESCRIPTION_MAX} characters (currently ${richTextPlainLength(snapshot.description)}).`,
    );
  }

  if (!Number.isFinite(snapshot.groupSize) || snapshot.groupSize < 1) {
    reasons.push("Set a group size of at least 1.");
  }

  const locationCheck = sanitizePlainText(snapshot.berlinBase, {
    min: 2,
    max: 300,
  });
  if (!locationCheck.ok) {
    reasons.push("Confirm a base location from the search suggestions.");
  }

  if (
    !Number.isFinite(snapshot.travelRadiusKm) ||
    snapshot.travelRadiusKm < 0
  ) {
    reasons.push("Set a travel radius (0 km or more).");
  }

  if (
    !Number.isFinite(snapshot.priceMinCents) ||
    !Number.isFinite(snapshot.priceMaxCents) ||
    snapshot.priceMinCents < 0 ||
    snapshot.priceMaxCents < 0
  ) {
    reasons.push("Set indicative price minimum and maximum.");
  } else if (snapshot.priceMaxCents < snapshot.priceMinCents) {
    reasons.push("Price maximum must be at least the minimum.");
  } else if (snapshot.priceMaxCents <= 0) {
    reasons.push("Set an indicative price range greater than zero.");
  }

  if (snapshot.imageCount < 1) {
    reasons.push("Add at least one portfolio photo.");
  }

  if (!hasPublicUrl(snapshot)) {
    reasons.push(
      "Add at least one public link (website, social, or featured video).",
    );
  }

  if (!snapshot.legalIdentityComplete) {
    reasons.push(
      "Complete legal and payment identity before publishing to the marketplace.",
    );
  }

  if (reasons.length > 0) return { ok: false, reasons };
  return { ok: true };
}
