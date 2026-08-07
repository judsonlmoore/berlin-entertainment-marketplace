import { eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { accountLegalIdentities } from "@/src/db/schema/marketplace";
import type { LegalIdentityFields } from "@/src/domain/legal-identity";
import { toLegalIdentityFields } from "@/src/domain/legal-identity";

export async function getLegalIdentityForUser(userId: string) {
  const db = getDb();
  const row = await db.query.accountLegalIdentities.findFirst({
    where: eq(accountLegalIdentities.userId, userId),
  });
  return toLegalIdentityFields(row);
}

export async function upsertLegalIdentity(
  userId: string,
  fields: LegalIdentityFields,
) {
  const db = getDb();
  const values = {
    userId,
    entityType: fields.entityType,
    legalName: fields.legalName.trim(),
    tradingName: fields.tradingName?.trim() || null,
    addressLine1: fields.addressLine1.trim(),
    addressLine2: fields.addressLine2?.trim() || null,
    postalCode: fields.postalCode.trim(),
    city: fields.city.trim(),
    countryCode: fields.countryCode.trim().toUpperCase().slice(0, 2),
    taxId: fields.taxId?.trim() || null,
    companyRegisterId: fields.companyRegisterId?.trim() || null,
    invoiceEmail: fields.invoiceEmail.trim(),
    iban: fields.iban?.trim() || null,
    bic: fields.bic?.trim() || null,
    paymentNote: fields.paymentNote?.trim() || null,
    updatedAt: new Date(),
  };

  const existing = await db.query.accountLegalIdentities.findFirst({
    where: eq(accountLegalIdentities.userId, userId),
  });

  if (existing) {
    await db
      .update(accountLegalIdentities)
      .set(values)
      .where(eq(accountLegalIdentities.userId, userId));
  } else {
    await db.insert(accountLegalIdentities).values(values);
  }

  return getLegalIdentityForUser(userId);
}
