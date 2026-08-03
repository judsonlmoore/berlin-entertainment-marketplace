import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  agreementTemplates,
  agreements,
  signatures,
  venueMemberships,
} from "@/src/db/schema/marketplace";

export async function getLatestSandboxTemplates() {
  const db = getDb();
  const [german] = await db
    .select()
    .from(agreementTemplates)
    .where(eq(agreementTemplates.locale, "de"))
    .orderBy(desc(agreementTemplates.createdAt))
    .limit(1);
  const [english] = await db
    .select()
    .from(agreementTemplates)
    .where(eq(agreementTemplates.locale, "en"))
    .orderBy(desc(agreementTemplates.createdAt))
    .limit(1);
  return { german: german ?? null, english: english ?? null };
}

export async function getAgreementForBooking(bookingId: string) {
  const db = getDb();
  const agreement = await db.query.agreements.findFirst({
    where: eq(agreements.bookingId, bookingId),
  });
  if (!agreement) return null;

  const signatureRows = await db
    .select()
    .from(signatures)
    .where(eq(signatures.agreementId, agreement.id))
    .orderBy(signatures.createdAt);

  return { agreement, signatures: signatureRows };
}

export async function getVenueOwnerUserId(venueId: string) {
  const db = getDb();
  const [owner] = await db
    .select({ userId: venueMemberships.userId })
    .from(venueMemberships)
    .where(
      and(
        eq(venueMemberships.venueId, venueId),
        eq(venueMemberships.role, "owner"),
        eq(venueMemberships.status, "active"),
      ),
    )
    .limit(1);
  return owner?.userId ?? null;
}
