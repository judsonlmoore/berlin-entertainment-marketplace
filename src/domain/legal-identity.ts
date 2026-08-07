import type { InferSelectModel } from "drizzle-orm";
import type { accountLegalIdentities } from "@/src/db/schema/marketplace";

export type LegalEntityType =
  "individual" | "freelancer" | "registered_business";

export type LegalIdentityFields = {
  entityType: LegalEntityType;
  legalName: string;
  tradingName: string | null;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string;
  city: string;
  countryCode: string;
  taxId: string | null;
  companyRegisterId: string | null;
  invoiceEmail: string;
  iban: string | null;
  bic: string | null;
  paymentNote: string | null;
};

export type LegalIdentityRow = InferSelectModel<typeof accountLegalIdentities>;

export function toLegalIdentityFields(
  row: LegalIdentityRow | null | undefined,
): LegalIdentityFields | null {
  if (!row) return null;
  return {
    entityType: row.entityType,
    legalName: row.legalName,
    tradingName: row.tradingName,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    postalCode: row.postalCode,
    city: row.city,
    countryCode: row.countryCode,
    taxId: row.taxId,
    companyRegisterId: row.companyRegisterId,
    invoiceEmail: row.invoiceEmail,
    iban: row.iban,
    bic: row.bic,
    paymentNote: row.paymentNote,
  };
}

/** Completeness for Generate agreement (MVP rules from invoice spike). */
export function isLegalIdentityComplete(
  identity: LegalIdentityFields | null | undefined,
): boolean {
  if (!identity) return false;
  const required = [
    identity.legalName,
    identity.addressLine1,
    identity.postalCode,
    identity.city,
    identity.countryCode,
    identity.invoiceEmail,
  ];
  if (required.some((v) => !v.trim())) return false;

  const needsTax =
    identity.countryCode.toUpperCase() === "DE" &&
    (identity.entityType === "freelancer" ||
      identity.entityType === "registered_business");
  if (needsTax && !identity.taxId?.trim()) return false;

  return true;
}

export function publicLegalIdentityView(identity: LegalIdentityFields): Omit<
  LegalIdentityFields,
  "iban" | "bic" | "paymentNote"
> & {
  hasPaymentInstructions: boolean;
} {
  return {
    entityType: identity.entityType,
    legalName: identity.legalName,
    tradingName: identity.tradingName,
    addressLine1: identity.addressLine1,
    addressLine2: identity.addressLine2,
    postalCode: identity.postalCode,
    city: identity.city,
    countryCode: identity.countryCode,
    taxId: identity.taxId,
    companyRegisterId: identity.companyRegisterId,
    invoiceEmail: identity.invoiceEmail,
    hasPaymentInstructions: Boolean(
      identity.iban?.trim() || identity.paymentNote?.trim(),
    ),
  };
}
