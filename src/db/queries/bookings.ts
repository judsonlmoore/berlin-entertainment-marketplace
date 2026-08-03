import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  agreements,
  bookingTerms,
  bookings,
  depositStatusEvents,
  entertainerProfiles,
  signatures,
  venues,
} from "@/src/db/schema/marketplace";
import { renderAgreementDocuments } from "@/src/domain/agreement";
import { getLatestSandboxTemplates } from "@/src/db/queries/agreements";

export async function listBookingsForActor(input: {
  userId: string;
  venueIds: string[];
  entertainerProfileId: string | null;
}) {
  const db = getDb();
  const partyFilters = [];
  if (input.venueIds.length > 0) {
    partyFilters.push(inArray(bookings.venueId, input.venueIds));
  }
  if (input.entertainerProfileId) {
    partyFilters.push(
      eq(bookings.entertainerProfileId, input.entertainerProfileId),
    );
  }
  if (partyFilters.length === 0) {
    return [];
  }

  return db
    .select({
      id: bookings.id,
      state: bookings.state,
      originType: bookings.originType,
      originId: bookings.originId,
      version: bookings.version,
      depositStatus: bookings.depositStatus,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      venueId: venues.id,
      venueName: venues.name,
      district: venues.district,
      entertainerProfileId: entertainerProfiles.id,
      actName: entertainerProfiles.actName,
      entertainerUserId: entertainerProfiles.userId,
    })
    .from(bookings)
    .innerJoin(venues, eq(venues.id, bookings.venueId))
    .innerJoin(
      entertainerProfiles,
      eq(entertainerProfiles.id, bookings.entertainerProfileId),
    )
    .where(or(...partyFilters))
    .orderBy(desc(bookings.updatedAt));
}

export async function getBookingDetail(bookingId: string) {
  const db = getDb();
  const [booking] = await db
    .select({
      id: bookings.id,
      state: bookings.state,
      originType: bookings.originType,
      originId: bookings.originId,
      version: bookings.version,
      depositStatus: bookings.depositStatus,
      cancelledAt: bookings.cancelledAt,
      cancelledReason: bookings.cancelledReason,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      venueId: venues.id,
      venueName: venues.name,
      district: venues.district,
      entertainerProfileId: entertainerProfiles.id,
      actName: entertainerProfiles.actName,
      entertainerUserId: entertainerProfiles.userId,
    })
    .from(bookings)
    .innerJoin(venues, eq(venues.id, bookings.venueId))
    .innerJoin(
      entertainerProfiles,
      eq(entertainerProfiles.id, bookings.entertainerProfileId),
    )
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) return null;

  const terms = await db
    .select()
    .from(bookingTerms)
    .where(eq(bookingTerms.bookingId, bookingId))
    .orderBy(desc(bookingTerms.version));

  const depositEvents = await db
    .select()
    .from(depositStatusEvents)
    .where(eq(depositStatusEvents.bookingId, bookingId))
    .orderBy(desc(depositStatusEvents.createdAt));

  const agreement = await db.query.agreements.findFirst({
    where: eq(agreements.bookingId, bookingId),
  });
  const signatureRows = agreement
    ? await db
        .select()
        .from(signatures)
        .where(eq(signatures.agreementId, agreement.id))
        .orderBy(signatures.createdAt)
    : [];

  let rendered: {
    germanBody: string;
    englishBody: string;
  } | null = null;
  if (agreement) {
    const termsRow = terms.find((row) => row.id === agreement.bookingTermsId);
    const templates = await getLatestSandboxTemplates();
    if (termsRow && templates.german && templates.english) {
      const docs = renderAgreementDocuments({
        germanTemplate: templates.german,
        englishTemplate: templates.english,
        terms: {
          actName: booking.actName,
          venueName: booking.venueName,
          startsAtIso: termsRow.startsAt.toISOString(),
          endsAtIso: termsRow.endsAt.toISOString(),
          timezone: termsRow.timezone,
          feeCents: termsRow.feeCents,
          currency: termsRow.currency,
          performanceFormat: termsRow.performanceFormat,
          cancellationTerms: termsRow.cancellationTerms,
          productionObligations: termsRow.productionObligations,
          depositTerms: termsRow.depositTerms,
          termsVersion: termsRow.version,
        },
      });
      rendered = {
        germanBody: docs.germanBody,
        englishBody: docs.englishBody,
      };
    }
  }

  return {
    booking,
    terms,
    depositEvents,
    agreement: agreement
      ? { ...agreement, signatures: signatureRows, rendered }
      : null,
  };
}

export async function getLatestTermsVersion(bookingId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      maxVersion: sql<number>`max(${bookingTerms.version})`.mapWith(Number),
    })
    .from(bookingTerms)
    .where(eq(bookingTerms.bookingId, bookingId));
  return row?.maxVersion ?? null;
}

export async function getLatestOpenTerms(bookingId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(bookingTerms)
    .where(
      and(
        eq(bookingTerms.bookingId, bookingId),
        isNull(bookingTerms.acceptedAt),
      ),
    )
    .orderBy(desc(bookingTerms.version))
    .limit(1);
  return row ?? null;
}
