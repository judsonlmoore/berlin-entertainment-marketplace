import {
  wizardStepsForRole,
  type WizardRole,
} from "@/src/domain/onboarding-wizard-steps";
import {
  parseSubcategory,
  parseVenueType,
} from "@/src/domain/profile-taxonomy";
import {
  DESCRIPTION_MIN,
  NOTES_MAX,
  richTextPlainLength,
} from "@/src/domain/sanitize-input";

type EntertainerProgress = {
  actName: string;
  category: string;
  genres: string;
  description: string;
  berlinBase: string;
  priceMaxCents: number;
  hasLink: boolean;
  imageCount: number;
  legalComplete: boolean;
};

type VenueProgress = {
  name: string;
  venueType: string;
  shortDescription: string;
  addressLine1: string;
  district: string;
  postalCode: string;
  capacity: number;
  audienceDescription: string;
  imageCount: number;
  legalComplete: boolean;
};

function stepDone(
  role: WizardRole,
  stepId: string,
  entertainer: EntertainerProgress,
  venue: VenueProgress,
): boolean {
  if (stepId === "chapter_a" || stepId === "chapter_b") return true;
  if (role === "entertainer") {
    switch (stepId) {
      case "act_name":
        return entertainer.actName.trim().length >= 2;
      case "category": {
        const sub = parseSubcategory(entertainer.genres);
        return (
          entertainer.category.trim().length > 0 &&
          sub.subcategoryId.trim().length > 0
        );
      }
      case "description":
        return richTextPlainLength(entertainer.description) >= DESCRIPTION_MIN;
      case "hero_photo":
        return entertainer.imageCount > 0;
      case "location":
        return entertainer.berlinBase.trim().length >= 2;
      case "fee":
        return entertainer.priceMaxCents > 0;
      case "links":
        return entertainer.hasLink;
      case "legal":
        return entertainer.legalComplete;
      case "notes":
        return true;
      case "go_live":
        return false;
      default:
        return false;
    }
  }

  switch (stepId) {
    case "venue_name":
      return venue.name.trim().length >= 2;
    case "venue_type": {
      const parsed = parseVenueType(venue.venueType);
      return (
        parsed.categoryId.trim().length > 0 &&
        parsed.subcategoryRaw.trim().length > 0
      );
    }
    case "description":
      return richTextPlainLength(venue.shortDescription) >= DESCRIPTION_MIN;
    case "address":
      return (
        venue.addressLine1.trim().length > 0 &&
        venue.district.trim().length > 0 &&
        venue.postalCode.trim().length > 0
      );
    case "capacity":
      return (
        venue.capacity >= 1 &&
        richTextPlainLength(venue.audienceDescription) >= DESCRIPTION_MIN &&
        richTextPlainLength(venue.audienceDescription) <= NOTES_MAX
      );
    case "hero_photo":
      return venue.imageCount > 0;
    case "legal":
      return venue.legalComplete;
    case "notes":
      return true;
    case "go_live":
      return false;
    default:
      return false;
  }
}

/** Resume index within an active wizard session (first incomplete field step). */
export function firstIncompleteWizardStepIndex(
  role: WizardRole,
  entertainer: EntertainerProgress,
  venue: VenueProgress,
): number {
  const steps = wizardStepsForRole(role);
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    if (step.kind === "chapter_intro") continue;
    if (!stepDone(role, step.id, entertainer, venue)) return i;
  }
  return steps.length - 1;
}
