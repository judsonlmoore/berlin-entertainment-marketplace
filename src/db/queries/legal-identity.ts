import { eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { accountLegalIdentities } from "@/src/db/schema/marketplace";
import { AppError } from "@/src/domain/errors";
import type { LegalIdentityFields } from "@/src/domain/legal-identity";
import {
  isLegalIdentityComplete,
  toLegalIdentityFields,
} from "@/src/domain/legal-identity";

export async function getLegalIdentityForUser(userId: string) {
  const db = getDb();
  const row = await db.query.accountLegalIdentities.findFirst({
    where: eq(accountLegalIdentities.userId, userId),
  });
  return toLegalIdentityFields(row);
}

/** Require complete Account legal identity before sending or accepting offers. */
export async function assertLegalIdentityComplete(userId: string): Promise<void> {
  const identity = await getLegalIdentityForUser(userId);
  if (!isLegalIdentityComplete(identity)) {
    throw new AppError(
      "validation",
      "Complete legal identity on Account before continuing",
    );
  }
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
