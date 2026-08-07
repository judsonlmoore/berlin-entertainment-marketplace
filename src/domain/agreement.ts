export type AgreementTermsSnapshot = {
  actName: string;
  venueName: string;
  startsAtIso: string;
  endsAtIso: string;
  timezone: string;
  feeCents: number;
  currency: string;
  performanceFormat: string;
  cancellationTerms: string;
  productionObligations: string;
  depositTerms: string | null;
  termsVersion: number;
};

export type RenderedAgreement = {
  germanControlling: true;
  germanBody: string;
  englishBody: string;
  germanTemplateVersion: string;
  englishTemplateVersion: string;
};

const PLACEHOLDER = /\{\{(\w+)\}\}/g;

function formatFee(cents: number, currency: string) {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

/** Human-readable instant in the booking timezone (falls back to ISO). */
export function formatAgreementInstant(
  iso: string,
  timezone: string,
  locale: "de" | "en",
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
      timeZone: timezone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return iso;
  }
}

function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(PLACEHOLDER, (_, key: string) => values[key] ?? "");
}

export function renderAgreementDocuments(input: {
  germanTemplate: { version: string; body: string; legalReviewStatus: string };
  englishTemplate: { version: string; body: string; legalReviewStatus: string };
  terms: AgreementTermsSnapshot;
}): RenderedAgreement {
  const values = {
    actName: input.terms.actName,
    venueName: input.terms.venueName,
    startsAt: formatAgreementInstant(
      input.terms.startsAtIso,
      input.terms.timezone,
      "de",
    ),
    endsAt: formatAgreementInstant(
      input.terms.endsAtIso,
      input.terms.timezone,
      "de",
    ),
    startsAtEn: formatAgreementInstant(
      input.terms.startsAtIso,
      input.terms.timezone,
      "en",
    ),
    endsAtEn: formatAgreementInstant(
      input.terms.endsAtIso,
      input.terms.timezone,
      "en",
    ),
    timezone: input.terms.timezone,
    fee: formatFee(input.terms.feeCents, input.terms.currency),
    performanceFormat: input.terms.performanceFormat,
    cancellationTerms: input.terms.cancellationTerms,
    productionObligations: input.terms.productionObligations,
    depositTerms: input.terms.depositTerms ?? "—",
    termsVersion: String(input.terms.termsVersion),
  };

  const germanValues = values;
  const englishValues = {
    ...values,
    startsAt: values.startsAtEn,
    endsAt: values.endsAtEn,
  };

  return {
    germanControlling: true,
    germanBody: fillTemplate(input.germanTemplate.body, germanValues),
    englishBody: fillTemplate(input.englishTemplate.body, englishValues),
    germanTemplateVersion: input.germanTemplate.version,
    englishTemplateVersion: input.englishTemplate.version,
  };
}

export function canGenerateAgreement(bookingState: string): boolean {
  return bookingState === "terms_agreed";
}

/**
 * Force-rebuild of the package PDF is allowed only while no party has signed.
 * Idempotent ensure (no force) may still return an existing package.
 */
export function canRebuildAgreementPackage(
  signatures: readonly { status: string }[],
): boolean {
  return !signatures.some((row) => row.status === "signed");
}

/** Sandbox invoice generation is gated on a confirmed booking only. */
export function canGenerateBookingInvoice(bookingState: string): boolean {
  return bookingState === "confirmed";
}

/**
 * After the agreement package is generated, booking-scoped document
 * upload/delete must stop so the frozen addenda snapshot stays coherent.
 */
export function bookingDocumentsLocked(bookingState: string): boolean {
  return (
    bookingState === "agreement_generated" ||
    bookingState === "partially_signed" ||
    bookingState === "confirmed"
  );
}

export function signatureProgress(input: {
  signatures: readonly { status: string }[];
}): "none" | "partial" | "complete" {
  if (input.signatures.length === 0) return "none";
  const signed = input.signatures.filter((s) => s.status === "signed").length;
  if (signed === 0) return "none";
  if (signed >= input.signatures.length) return "complete";
  return "partial";
}

/**
 * Maps signature progress onto the booking state machine.
 * Returns null when no transition is required (idempotent / already advanced).
 */
export function nextBookingStateAfterSignatures(input: {
  bookingState: string;
  progress: ReturnType<typeof signatureProgress>;
}): "partially_signed" | "confirmed" | null {
  const { bookingState, progress } = input;
  if (progress === "partial" && bookingState === "agreement_generated") {
    return "partially_signed";
  }
  if (
    progress === "complete" &&
    (bookingState === "agreement_generated" ||
      bookingState === "partially_signed")
  ) {
    return "confirmed";
  }
  return null;
}

/**
 * Party / staff gate shared by agreement package and invoice download routes.
 * Entertainer may match by profile id and/or user id depending on the query shape.
 */
export function isBookingArtifactParty(input: {
  isPlatformStaff: boolean;
  actorVenueId?: string | null;
  actorEntertainerProfileId?: string | null;
  actorUserId?: string | null;
  bookingVenueId: string;
  bookingEntertainerProfileId?: string | null;
  bookingEntertainerUserId?: string | null;
}): boolean {
  if (input.isPlatformStaff) return true;
  if (input.actorVenueId && input.actorVenueId === input.bookingVenueId) {
    return true;
  }
  if (
    input.actorEntertainerProfileId &&
    input.bookingEntertainerProfileId &&
    input.actorEntertainerProfileId === input.bookingEntertainerProfileId
  ) {
    return true;
  }
  if (
    input.actorUserId &&
    input.bookingEntertainerUserId &&
    input.actorUserId === input.bookingEntertainerUserId
  ) {
    return true;
  }
  return false;
}

/** Local sandbox only — never claims production legal force. */
export function isSandboxAgreementLabel(provider: string | null | undefined) {
  return !provider || provider === "sandbox" || provider === "unconfigured";
}
