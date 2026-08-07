import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  agreements,
  bookingInvoices,
  bookingTerms,
  bookings,
  depositStatusEvents,
  entertainerProfiles,
  signatures,
  venues,
} from "@/src/db/schema/marketplace";

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
      venueOwnerUserId: venues.ownerUserId,
      venuePublicationState: venues.publicationState,
      entertainerProfileId: entertainerProfiles.id,
      actName: entertainerProfiles.actName,
      entertainerUserId: entertainerProfiles.userId,
      entertainerPublicationState: entertainerProfiles.publicationState,
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

  const invoice = await db.query.bookingInvoices.findFirst({
    where: eq(bookingInvoices.bookingId, bookingId),
  });

  return {
    booking,
    terms,
    depositEvents,
    invoice: invoice ?? null,
    agreement: agreement
      ? {
          ...agreement,
          signatures: signatureRows,
          rendered: {
            germanBody: agreement.germanBody,
            englishBody: agreement.englishBody,
          },
        }
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
        isNull(bookingTerms.supersededAt),
      ),
    )
    .orderBy(desc(bookingTerms.version))
    .limit(1);
  return row ?? null;
}
