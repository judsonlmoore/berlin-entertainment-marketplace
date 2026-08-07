import {
  DESCRIPTION_MIN,
  NOTES_MAX,
  SHORT_DESCRIPTION_MAX,
  richTextPlainLength,
  validateRichTextField,
} from "@/src/domain/sanitize-input";

/** Form `name` attributes / scroll targets on the venue profile editor. */
export type VenuePublishField =
  | "name"
  | "shortDescription"
  | "addressLine1"
  | "district"
  | "postalCode"
  | "venueCategory"
  | "capacity"
  | "audienceDescription"
  | "legalIdentity";

export type VenuePublishIssue = {
  field: VenuePublishField;
  message: string;
};

export type VenuePublishSnapshot = {
  name: string;
  shortDescription: string;
  addressLine1: string;
  district: string;
  postalCode: string;
  venueType: string;
  audienceDescription: string;
  capacity: number;
  /** Required to appear in the marketplace; private until terms are agreed. */
  legalIdentityComplete: boolean;
};

export type VenuePublishReadinessResult =
  | { ok: true }
  | { ok: false; issues: VenuePublishIssue[] };

/**
 * Built-in QA gate for self-serve venue publish.
 * Coordinates are optional (Places prefill may supply them).
 */
export function checkVenuePublishReadiness(
  snapshot: VenuePublishSnapshot,
): VenuePublishReadinessResult {
  const issues: VenuePublishIssue[] = [];

  if (!snapshot.name.trim()) {
    issues.push({ field: "name", message: "Venue name is required." });
  }

  const shortCheck = validateRichTextField(snapshot.shortDescription, {
    min: DESCRIPTION_MIN,
    max: SHORT_DESCRIPTION_MAX,
  });
  if (!shortCheck.ok) {
    const length = richTextPlainLength(snapshot.shortDescription);
    issues.push({
      field: "shortDescription",
      message:
        length === 0
          ? "Short description is required."
          : `Short description needs at least ${DESCRIPTION_MIN} characters (currently ${length}).`,
    });
  }

  if (!snapshot.addressLine1.trim()) {
    issues.push({
      field: "addressLine1",
      message: "Street address is required.",
    });
  }
  if (!snapshot.district.trim()) {
    issues.push({ field: "district", message: "District is required." });
  }
  if (!snapshot.postalCode.trim()) {
    issues.push({
      field: "postalCode",
      message: "Postal code is required.",
    });
  }

  if (!snapshot.venueType.trim() || snapshot.venueType === "uncategorized") {
    issues.push({
      field: "venueCategory",
      message: "Choose a venue type.",
    });
  }

  if (!Number.isFinite(snapshot.capacity) || snapshot.capacity < 1) {
    issues.push({
      field: "capacity",
      message: "Capacity must be at least 1.",
    });
  }

  const audienceCheck = validateRichTextField(snapshot.audienceDescription, {
    min: DESCRIPTION_MIN,
    max: NOTES_MAX,
  });
  if (!audienceCheck.ok) {
    const length = richTextPlainLength(snapshot.audienceDescription);
    issues.push({
      field: "audienceDescription",
      message:
        length === 0
          ? "Audience description is required."
          : `Audience description needs at least ${DESCRIPTION_MIN} characters (currently ${length}).`,
    });
  }

  if (!snapshot.legalIdentityComplete) {
    issues.push({
      field: "legalIdentity",
      message:
        "Complete legal and payment identity before publishing to the marketplace.",
    });
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true };
}
