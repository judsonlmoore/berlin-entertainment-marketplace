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

/** Local sandbox only — never claims production legal force. */
export function isSandboxAgreementLabel(provider: string | null | undefined) {
  return !provider || provider === "sandbox" || provider === "unconfigured";
}
