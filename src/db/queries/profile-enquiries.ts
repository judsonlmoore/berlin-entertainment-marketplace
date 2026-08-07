import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { assertNoHardCalendarConflict } from "@/src/db/queries/calendar-ops";
import { upsertBookingCalendarEntry } from "@/src/db/queries/calendar";
import {
  auditEvents,
  bookingTerms,
  bookings,
  entertainerProfiles,
  profileEnquiries,
  venues,
} from "@/src/db/schema/marketplace";
import {
  canTransitionBooking,
  type BookingState,
} from "@/src/domain/booking";
import type { ActorContext } from "@/src/domain/permissions";
import { AppError } from "@/src/domain/errors";
import {
  PROFILE_OFFER_EXPIRY_DAYS,
  isProfileOfferExpired,
} from "@/src/domain/profile-offer-expiry";

export { PROFILE_OFFER_EXPIRY_DAYS };

const PENDING_ENQUIRY_STATE = "pending" as const;
const PENDING_BOOKING_STATES = ["applied", "requested"] as const;

export type ProfileOfferTermsInput = {
  startsAt: Date;
  endsAt: Date;
  feeCents: number;
  performanceFormat: string;
  cancellationTerms: string;
  productionObligations: string;
  depositTerms?: string | null;
  changeNote?: string | null;
};

/** Open pending profile offers for an act↔venue pair (multi-engagement). */
export async function listOpenOfferBookingsForPair(input: {
  venueId: string;
  entertainerProfileId: string;
  now?: Date;
}): Promise<{ bookingId: string; enquiryId: string; createdAt: Date }[]> {
  const now = input.now ?? new Date();
  const db = getDb();
  const rows = await db
    .select({
      bookingId: bookings.id,
      enquiryId: profileEnquiries.id,
      createdAt: profileEnquiries.createdAt,
      bookingState: bookings.state,
    })
    .from(profileEnquiries)
    .innerJoin(
      bookings,
      and(
        eq(bookings.originType, "profile_enquiry"),
        eq(bookings.originId, profileEnquiries.id),
      ),
    )
    .where(
      and(
        eq(profileEnquiries.venueId, input.venueId),
        eq(profileEnquiries.entertainerProfileId, input.entertainerProfileId),
        eq(profileEnquiries.state, PENDING_ENQUIRY_STATE),
        inArray(bookings.state, [...PENDING_BOOKING_STATES]),
      ),
    )
    .orderBy(desc(profileEnquiries.createdAt));

  return rows
    .filter((row) => !isProfileOfferExpired(row.createdAt, now))
    .map((row) => ({
      bookingId: row.bookingId,
      enquiryId: row.enquiryId,
      createdAt: row.createdAt,
    }));
}

export type VenueActConnectionStatus = {
  venueId: string;
  /** Pending unanswered offers (newest first). */
  openOfferBookingIds: string[];
};

/**
 * Per-venue open pending offers for a talent profile (no send cooldown).
 */
export async function listVenueActConnectionStatuses(input: {
  entertainerProfileId: string;
  venueIds: string[];
}): Promise<VenueActConnectionStatus[]> {
  if (input.venueIds.length === 0) return [];

  const now = new Date();
  const db = getDb();
  const rows = await db
    .select({
      venueId: profileEnquiries.venueId,
      createdAt: profileEnquiries.createdAt,
      bookingId: bookings.id,
    })
    .from(profileEnquiries)
    .innerJoin(
      bookings,
      and(
        eq(bookings.originType, "profile_enquiry"),
        eq(bookings.originId, profileEnquiries.id),
      ),
    )
    .where(
      and(
        eq(profileEnquiries.entertainerProfileId, input.entertainerProfileId),
        inArray(profileEnquiries.venueId, input.venueIds),
        eq(profileEnquiries.state, PENDING_ENQUIRY_STATE),
        inArray(bookings.state, [...PENDING_BOOKING_STATES]),
      ),
    )
    .orderBy(desc(profileEnquiries.createdAt));

  const byVenue = new Map<string, string[]>();
  for (const venueId of input.venueIds) {
    byVenue.set(venueId, []);
  }
  for (const row of rows) {
    if (!row.bookingId || isProfileOfferExpired(row.createdAt, now)) continue;
    const list = byVenue.get(row.venueId);
    if (list) list.push(row.bookingId);
  }

  return input.venueIds.map((venueId) => ({
    venueId,
    openOfferBookingIds: byVenue.get(venueId) ?? [],
  }));
}

export async function submitProfileEnquiry(input: {
  actor: ActorContext;
  venueId: string;
  offer: ProfileOfferTermsInput;
  note?: string;
}): Promise<{ enquiryId: string; bookingId: string }> {
  const db = getDb();

  const profile = await db.query.entertainerProfiles.findFirst({
    where: and(
      eq(entertainerProfiles.userId, input.actor.userId),
      eq(entertainerProfiles.publicationState, "approved"),
    ),
  });
  if (!profile) {
    throw new AppError("validation", "Published act profile required");
  }

  const venue = await db.query.venues.findFirst({
    where: and(
      eq(venues.id, input.venueId),
      eq(venues.publicationState, "approved"),
    ),
  });
  if (!venue) {
    throw new AppError("not_found", "Venue not found");
  }

  return createProfileEnquiry({
    actorUserId: input.actor.userId,
    venueId: input.venueId,
    entertainerProfileId: profile.id,
    offer: input.offer,
    ...(input.note !== undefined ? { note: input.note } : {}),
    bookingState: "applied",
    auditAction: "profile_enquiry.offer_sent",
  });
}

/**
 * Venue-initiated profile offer (mirror of talent Send offer).
 * Receiver Accept / Counter / Decline on the booking.
 */
export async function sendVenueConnectionRequest(input: {
  actor: ActorContext;
  venueId: string;
  entertainerProfileId: string;
  offer: ProfileOfferTermsInput;
  note?: string;
}): Promise<{ enquiryId: string; bookingId: string }> {
  const db = getDb();

  const venue = await db.query.venues.findFirst({
    where: eq(venues.id, input.venueId),
  });
  if (!venue) {
    throw new AppError("not_found", "Venue not found");
  }
  if (venue.publicationState !== "approved") {
    throw new AppError(
      "validation",
      "Publish your venue profile before sending an offer",
    );
  }

  const profile = await db.query.entertainerProfiles.findFirst({
    where: and(
      eq(entertainerProfiles.id, input.entertainerProfileId),
      eq(entertainerProfiles.publicationState, "approved"),
    ),
  });
  if (!profile) {
    throw new AppError("not_found", "Act not found");
  }
  if (profile.userId === input.actor.userId) {
    throw new AppError("validation", "Cannot connect to yourself");
  }

  return createProfileEnquiry({
    actorUserId: input.actor.userId,
    venueId: input.venueId,
    entertainerProfileId: profile.id,
    offer: input.offer,
    ...(input.note !== undefined ? { note: input.note } : {}),
    bookingState: "requested",
    auditAction: "profile_enquiry.offer_sent",
  });
}

async function createProfileEnquiry(input: {
  actorUserId: string;
  venueId: string;
  entertainerProfileId: string;
  offer: ProfileOfferTermsInput;
  note?: string;
  bookingState: "applied" | "requested";
  auditAction: string;
}): Promise<{ enquiryId: string; bookingId: string }> {
  const db = getDb();

  if (input.offer.endsAt <= input.offer.startsAt) {
    throw new AppError("validation", "End must be after start");
  }
  if (input.offer.feeCents < 0) {
    throw new AppError("validation", "Fee must be non-negative");
  }

  const note = input.note?.trim() || null;
  let enquiryId = "";
  let bookingId = "";

  await db.transaction(async (tx) => {
    const [enquiry] = await tx
      .insert(profileEnquiries)
      .values({
        venueId: input.venueId,
        entertainerProfileId: input.entertainerProfileId,
        submittedByUserId: input.actorUserId,
        note,
        proposedStartsAt: input.offer.startsAt,
        proposedEndsAt: input.offer.endsAt,
        proposedFeeCents: input.offer.feeCents,
        proposedFormat: input.offer.performanceFormat,
        state: "pending",
      })
      .returning({ id: profileEnquiries.id });
    if (!enquiry) throw new AppError("conflict", "Could not create enquiry");
    enquiryId = enquiry.id;

    const [booking] = await tx
      .insert(bookings)
      .values({
        originType: "profile_enquiry",
        originId: enquiry.id,
        venueId: input.venueId,
        entertainerProfileId: input.entertainerProfileId,
        state: input.bookingState,
      })
      .returning({ id: bookings.id });
    if (!booking) throw new AppError("conflict", "Could not create lead");
    bookingId = booking.id;

    await tx.insert(bookingTerms).values({
      bookingId: booking.id,
      version: 1,
      proposedByUserId: input.actorUserId,
      startsAt: input.offer.startsAt,
      endsAt: input.offer.endsAt,
      feeCents: input.offer.feeCents,
      performanceFormat: input.offer.performanceFormat,
      cancellationTerms: input.offer.cancellationTerms,
      productionObligations: input.offer.productionObligations,
      depositTerms: input.offer.depositTerms ?? null,
      changeNote: input.offer.changeNote?.trim() || null,
      snapshot: {
        venueId: input.venueId,
        entertainerProfileId: input.entertainerProfileId,
        originType: "profile_enquiry",
        originId: enquiry.id,
        proposedByUserId: input.actorUserId,
        proposedAt: new Date().toISOString(),
      },
    });

    await tx.insert(auditEvents).values({
      actorUserId: input.actorUserId,
      action: input.auditAction,
      subjectType: "profile_enquiry",
      subjectId: enquiry.id,
      metadata: { venueId: input.venueId, bookingId: booking.id },
    });
  });

  return { enquiryId, bookingId };
}

/**
 * On Accept or Counter of a pending profile offer: mark enquiry interested and
 * unlock contacts. Caller owns booking state transitions / version bumps.
 */
export async function establishProfileEnquiryConnection(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  input: {
    booking: {
      id: string;
      state: string;
      originType: string;
      originId: string;
      venueId: string;
      entertainerProfileId: string;
    };
    entertainerUserId: string;
    actorUserId: string;
    startsAt?: Date | null;
    endsAt?: Date | null;
  },
): Promise<{ unlocked: boolean }> {
  if (input.booking.originType !== "profile_enquiry") {
    return { unlocked: false };
  }

  const enquiry = await tx.query.profileEnquiries.findFirst({
    where: eq(profileEnquiries.id, input.booking.originId),
  });
  if (!enquiry) {
    throw new AppError("not_found", "Enquiry not found");
  }

  if (isProfileOfferExpired(enquiry.createdAt)) {
    throw new AppError(
      "invalid_transition",
      "This offer expired after 7 days without a response",
    );
  }

  const pending =
    input.booking.state === "applied" || input.booking.state === "requested";
  if (!pending || enquiry.state !== "pending") {
    return { unlocked: false };
  }

  await tx
    .update(profileEnquiries)
    .set({
      state: "interested",
      updatedAt: new Date(),
    })
    .where(eq(profileEnquiries.id, enquiry.id));

  const { settleMatchAcceptance } =
    await import("@/src/db/queries/match-settlement");
  await settleMatchAcceptance(tx, {
    entertainerProfileId: input.booking.entertainerProfileId,
    entertainerUserId: input.entertainerUserId,
    venueId: input.booking.venueId,
    startsAt: input.startsAt ?? enquiry.proposedStartsAt,
    endsAt: input.endsAt ?? enquiry.proposedEndsAt,
    reason: "profile_offer_connection",
    origin: {
      bookingId: input.booking.id,
      profileEnquiryId: enquiry.id,
    },
  });

  await tx.insert(auditEvents).values({
    actorUserId: input.actorUserId,
    action: "profile_enquiry.connection_established",
    subjectType: "profile_enquiry",
    subjectId: enquiry.id,
    metadata: { bookingId: input.booking.id },
  });
  return { unlocked: true };
}

export async function respondToProfileEnquiry(input: {
  actor: ActorContext;
  enquiryId: string;
  decision: "interested" | "passed";
}): Promise<{ bookingId: string }> {
  const db = getDb();
  const enquiry = await db.query.profileEnquiries.findFirst({
    where: eq(profileEnquiries.id, input.enquiryId),
  });
  if (!enquiry) throw new AppError("not_found", "Enquiry not found");

  if (enquiry.state !== "pending") {
    throw new AppError("invalid_transition", "Enquiry is no longer pending");
  }
  if (isProfileOfferExpired(enquiry.createdAt)) {
    throw new AppError(
      "invalid_transition",
      "This offer expired after 7 days without a response",
    );
  }

  const profile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.id, enquiry.entertainerProfileId),
    columns: { userId: true },
  });
  if (!profile) throw new AppError("not_found", "Act profile not found");

  const isVenueMember = input.actor.venueId === enquiry.venueId;
  const isActOwner = profile.userId === input.actor.userId;
  const initiatedByAct = enquiry.submittedByUserId === profile.userId;

  // Receiver responds: venue if act submitted; act if venue submitted.
  if (initiatedByAct ? !isVenueMember : !isActOwner) {
    throw new AppError("forbidden", "Not allowed to respond to this enquiry");
  }

  const booking = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.originType, "profile_enquiry"),
      eq(bookings.originId, enquiry.id),
    ),
  });
  if (!booking) throw new AppError("not_found", "Lead not found");

  // Decline only via this path for pending offers (Accept/Counter use booking terms).
  if (input.decision === "interested") {
    throw new AppError(
      "invalid_transition",
      "Accept or counter the open offer instead of marking interested",
    );
  }

  const nextBookingState: BookingState = initiatedByAct
    ? "rejected"
    : "declined";
  if (!canTransitionBooking(booking.state as BookingState, nextBookingState)) {
    throw new AppError(
      "invalid_transition",
      `Cannot move booking from ${booking.state} to ${nextBookingState}`,
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(profileEnquiries)
      .set({
        state: "passed",
        updatedAt: new Date(),
      })
      .where(eq(profileEnquiries.id, enquiry.id));

    await tx
      .update(bookings)
      .set({
        state: nextBookingState,
        version: booking.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id));

    // Supersede any open offer so it cannot be accepted after decline.
    await tx
      .update(bookingTerms)
      .set({ supersededAt: new Date() })
      .where(
        and(
          eq(bookingTerms.bookingId, booking.id),
          sql`${bookingTerms.acceptedAt} IS NULL`,
          sql`${bookingTerms.supersededAt} IS NULL`,
        ),
      );

    await tx.insert(auditEvents).values({
      actorUserId: input.actor.userId,
      action: "profile_enquiry.passed",
      subjectType: "profile_enquiry",
      subjectId: enquiry.id,
      metadata: { bookingId: booking.id },
    });
  });

  return { bookingId: booking.id };
}

/**
 * Initiator withdraws a pending profile offer (before Accept / Counter / Decline).
 */
export async function withdrawProfileOffer(input: {
  actor: ActorContext;
  enquiryId: string;
}): Promise<{ bookingId: string }> {
  const db = getDb();
  const enquiry = await db.query.profileEnquiries.findFirst({
    where: eq(profileEnquiries.id, input.enquiryId),
  });
  if (!enquiry) throw new AppError("not_found", "Enquiry not found");
  if (enquiry.state !== "pending") {
    throw new AppError("invalid_transition", "Offer is no longer pending");
  }
  if (enquiry.submittedByUserId !== input.actor.userId) {
    throw new AppError("forbidden", "Only the sender can withdraw this offer");
  }

  const booking = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.originType, "profile_enquiry"),
      eq(bookings.originId, enquiry.id),
    ),
  });
  if (!booking) throw new AppError("not_found", "Booking not found");
  if (!canTransitionBooking(booking.state as BookingState, "withdrawn")) {
    throw new AppError(
      "invalid_transition",
      `Cannot withdraw booking from ${booking.state}`,
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(profileEnquiries)
      .set({ state: "withdrawn", updatedAt: new Date() })
      .where(eq(profileEnquiries.id, enquiry.id));

    await tx
      .update(bookings)
      .set({
        state: "withdrawn",
        version: booking.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id));

    await tx
      .update(bookingTerms)
      .set({ supersededAt: new Date() })
      .where(
        and(
          eq(bookingTerms.bookingId, booking.id),
          sql`${bookingTerms.acceptedAt} IS NULL`,
          sql`${bookingTerms.supersededAt} IS NULL`,
        ),
      );

    await tx.insert(auditEvents).values({
      actorUserId: input.actor.userId,
      action: "profile_enquiry.withdrawn",
      subjectType: "profile_enquiry",
      subjectId: enquiry.id,
      metadata: { bookingId: booking.id },
    });
  });

  return { bookingId: booking.id };
}

/**
 * Expire unanswered pending profile offers older than PROFILE_OFFER_EXPIRY_DAYS.
 * Idempotent — safe for cron.
 */
export async function expireStaleProfileOffers(input?: {
  now?: Date;
  actorUserId?: string | null;
}): Promise<{ expired: number; checkedAt: Date }> {
  const now = input?.now ?? new Date();
  const oldestStillValid = new Date(
    now.getTime() - PROFILE_OFFER_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );

  const db = getDb();
  const stale = await db
    .select({
      enquiryId: profileEnquiries.id,
      bookingId: bookings.id,
      bookingState: bookings.state,
      bookingVersion: bookings.version,
    })
    .from(profileEnquiries)
    .innerJoin(
      bookings,
      and(
        eq(bookings.originType, "profile_enquiry"),
        eq(bookings.originId, profileEnquiries.id),
      ),
    )
    .where(
      and(
        eq(profileEnquiries.state, PENDING_ENQUIRY_STATE),
        inArray(bookings.state, [...PENDING_BOOKING_STATES]),
        lt(profileEnquiries.createdAt, oldestStillValid),
      ),
    );

  let expired = 0;
  for (const row of stale) {
    if (!canTransitionBooking(row.bookingState as BookingState, "expired")) {
      continue;
    }
    // Claim with conditional UPDATEs so Accept/Counter between select and
    // write cannot be overwritten into expired/withdrawn.
    try {
      const claimed = await db.transaction(async (tx) => {
        const [claimedBooking] = await tx
          .update(bookings)
          .set({
            state: "expired",
            version: row.bookingVersion + 1,
            updatedAt: now,
          })
          .where(
            and(
              eq(bookings.id, row.bookingId),
              inArray(bookings.state, [...PENDING_BOOKING_STATES]),
              eq(bookings.version, row.bookingVersion),
            ),
          )
          .returning({ id: bookings.id });
        if (!claimedBooking) return false;

        const [claimedEnquiry] = await tx
          .update(profileEnquiries)
          .set({ state: "withdrawn", updatedAt: now })
          .where(
            and(
              eq(profileEnquiries.id, row.enquiryId),
              eq(profileEnquiries.state, PENDING_ENQUIRY_STATE),
            ),
          )
          .returning({ id: profileEnquiries.id });
        if (!claimedEnquiry) {
          // Roll back booking claim — enquiry already left pending.
          throw new AppError(
            "conflict",
            "Enquiry state changed during offer expiry",
          );
        }

        await tx
          .update(bookingTerms)
          .set({ supersededAt: now })
          .where(
            and(
              eq(bookingTerms.bookingId, row.bookingId),
              sql`${bookingTerms.acceptedAt} IS NULL`,
              sql`${bookingTerms.supersededAt} IS NULL`,
            ),
          );

        await tx.insert(auditEvents).values({
          actorUserId: input?.actorUserId ?? null,
          action: "profile_enquiry.expired",
          subjectType: "profile_enquiry",
          subjectId: row.enquiryId,
          metadata: { bookingId: row.bookingId },
        });
        return true;
      });
      if (claimed) expired += 1;
    } catch (error) {
      if (error instanceof AppError && error.code === "conflict") {
        continue;
      }
      throw error;
    }
  }

  return { expired, checkedAt: now };
}

export async function updateProfileEnquiryProposal(input: {
  actor: ActorContext;
  enquiryId: string;
  proposedStartsAt?: Date | null;
  proposedEndsAt?: Date | null;
  proposedFeeCents?: number | null;
  proposedFormat?: string | null;
  note?: string | null;
}): Promise<void> {
  const db = getDb();
  const enquiry = await db.query.profileEnquiries.findFirst({
    where: eq(profileEnquiries.id, input.enquiryId),
  });
  if (!enquiry) throw new AppError("not_found", "Enquiry not found");

  const profile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.id, enquiry.entertainerProfileId),
    columns: { userId: true },
  });
  const isAct = profile?.userId === input.actor.userId;
  const isVenue = input.actor.venueId === enquiry.venueId;
  if (!isAct && !isVenue && !input.actor.isPlatformStaff) {
    throw new AppError("forbidden", "Not a party to this lead");
  }

  if (enquiry.state !== "interested" && enquiry.state !== "pending") {
    throw new AppError(
      "invalid_transition",
      "Can only edit proposals on active enquiries",
    );
  }

  const starts =
    input.proposedStartsAt !== undefined
      ? input.proposedStartsAt
      : enquiry.proposedStartsAt;
  const ends =
    input.proposedEndsAt !== undefined
      ? input.proposedEndsAt
      : enquiry.proposedEndsAt;
  if (starts && ends && ends <= starts) {
    throw new AppError("validation", "End must be after start");
  }

  const booking = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.originType, "profile_enquiry"),
      eq(bookings.originId, enquiry.id),
    ),
    columns: { id: true },
  });

  const shouldPlaceCalendar =
    enquiry.state === "interested" && Boolean(starts && ends && booking?.id);

  if (shouldPlaceCalendar && starts && ends && booking) {
    await assertNoHardCalendarConflict({
      entertainerProfileId: enquiry.entertainerProfileId,
      venueId: enquiry.venueId,
      startsAt: starts,
      endsAt: ends,
      excludeBookingId: booking.id,
    });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(profileEnquiries)
      .set({
        ...(input.proposedStartsAt !== undefined
          ? { proposedStartsAt: input.proposedStartsAt }
          : {}),
        ...(input.proposedEndsAt !== undefined
          ? { proposedEndsAt: input.proposedEndsAt }
          : {}),
        ...(input.proposedFeeCents !== undefined
          ? { proposedFeeCents: input.proposedFeeCents }
          : {}),
        ...(input.proposedFormat !== undefined
          ? { proposedFormat: input.proposedFormat?.trim() || null }
          : {}),
        ...(input.note !== undefined
          ? { note: input.note?.trim() || null }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(profileEnquiries.id, enquiry.id));

    if (shouldPlaceCalendar && starts && ends && booking) {
      const { spaceId } = await assertNoHardCalendarConflict({
        entertainerProfileId: enquiry.entertainerProfileId,
        venueId: enquiry.venueId,
        startsAt: starts,
        endsAt: ends,
        excludeBookingId: booking.id,
      });
      await upsertBookingCalendarEntry(tx, {
        ownerType: "entertainer",
        ownerId: enquiry.entertainerProfileId,
        startsAt: starts,
        endsAt: ends,
        state: "requested",
        bookingId: booking.id,
      });
      await upsertBookingCalendarEntry(tx, {
        ownerType: "venue_space",
        ownerId: spaceId,
        startsAt: starts,
        endsAt: ends,
        state: "requested",
        bookingId: booking.id,
      });
    }

    await tx.insert(auditEvents).values({
      actorUserId: input.actor.userId,
      action: "profile_enquiry.proposal_updated",
      subjectType: "profile_enquiry",
      subjectId: enquiry.id,
      metadata: {
        dated: Boolean(starts && ends),
        ...(booking?.id ? { bookingId: booking.id } : {}),
      },
    });
  });
}

export async function listProfileEnquiriesForVenues(venueIds: string[]) {
  if (venueIds.length === 0) return [];
  const db = getDb();
  return db
    .select({
      id: profileEnquiries.id,
      state: profileEnquiries.state,
      note: profileEnquiries.note,
      venueId: profileEnquiries.venueId,
      venueName: venues.name,
      actName: entertainerProfiles.actName,
      entertainerProfileId: profileEnquiries.entertainerProfileId,
      entertainerUserId: entertainerProfiles.userId,
      submittedByUserId: profileEnquiries.submittedByUserId,
      createdAt: profileEnquiries.createdAt,
      proposedStartsAt: profileEnquiries.proposedStartsAt,
      proposedEndsAt: profileEnquiries.proposedEndsAt,
      proposedFeeCents: profileEnquiries.proposedFeeCents,
      proposedFormat: profileEnquiries.proposedFormat,
      bookingId: bookings.id,
      bookingState: bookings.state,
    })
    .from(profileEnquiries)
    .innerJoin(venues, eq(venues.id, profileEnquiries.venueId))
    .innerJoin(
      entertainerProfiles,
      eq(entertainerProfiles.id, profileEnquiries.entertainerProfileId),
    )
    .leftJoin(
      bookings,
      and(
        eq(bookings.originType, "profile_enquiry"),
        eq(bookings.originId, profileEnquiries.id),
      ),
    )
    .where(inArray(profileEnquiries.venueId, venueIds))
    .orderBy(desc(profileEnquiries.createdAt));
}

export async function listProfileEnquiriesForEntertainer(userId: string) {
  const db = getDb();
  const profile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.userId, userId),
    columns: { id: true },
  });
  if (!profile) return [];

  return db
    .select({
      id: profileEnquiries.id,
      state: profileEnquiries.state,
      note: profileEnquiries.note,
      venueId: profileEnquiries.venueId,
      venueName: venues.name,
      district: venues.district,
      actName: entertainerProfiles.actName,
      entertainerProfileId: profileEnquiries.entertainerProfileId,
      entertainerUserId: entertainerProfiles.userId,
      submittedByUserId: profileEnquiries.submittedByUserId,
      createdAt: profileEnquiries.createdAt,
      proposedStartsAt: profileEnquiries.proposedStartsAt,
      proposedEndsAt: profileEnquiries.proposedEndsAt,
      proposedFeeCents: profileEnquiries.proposedFeeCents,
      proposedFormat: profileEnquiries.proposedFormat,
      bookingId: bookings.id,
      bookingState: bookings.state,
    })
    .from(profileEnquiries)
    .innerJoin(venues, eq(venues.id, profileEnquiries.venueId))
    .innerJoin(
      entertainerProfiles,
      eq(entertainerProfiles.id, profileEnquiries.entertainerProfileId),
    )
    .leftJoin(
      bookings,
      and(
        eq(bookings.originType, "profile_enquiry"),
        eq(bookings.originId, profileEnquiries.id),
      ),
    )
    .where(eq(profileEnquiries.entertainerProfileId, profile.id))
    .orderBy(desc(profileEnquiries.createdAt));
}

/** Venue owner who should receive enquiry notifications. */
export async function listVenueOperatorUserIds(venueId: string) {
  const db = getDb();
  const venue = await db.query.venues.findFirst({
    where: eq(venues.id, venueId),
    columns: { ownerUserId: true },
  });
  return venue?.ownerUserId ? [venue.ownerUserId] : [];
}

export async function getProfileEnquiryById(enquiryId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: profileEnquiries.id,
      state: profileEnquiries.state,
      note: profileEnquiries.note,
      venueId: profileEnquiries.venueId,
      venueName: venues.name,
      actName: entertainerProfiles.actName,
      entertainerProfileId: profileEnquiries.entertainerProfileId,
      entertainerUserId: entertainerProfiles.userId,
      submittedByUserId: profileEnquiries.submittedByUserId,
      createdAt: profileEnquiries.createdAt,
      proposedStartsAt: profileEnquiries.proposedStartsAt,
      proposedEndsAt: profileEnquiries.proposedEndsAt,
      proposedFeeCents: profileEnquiries.proposedFeeCents,
      proposedFormat: profileEnquiries.proposedFormat,
      bookingId: bookings.id,
      bookingState: bookings.state,
    })
    .from(profileEnquiries)
    .innerJoin(venues, eq(venues.id, profileEnquiries.venueId))
    .innerJoin(
      entertainerProfiles,
      eq(entertainerProfiles.id, profileEnquiries.entertainerProfileId),
    )
    .leftJoin(
      bookings,
      and(
        eq(bookings.originType, "profile_enquiry"),
        eq(bookings.originId, profileEnquiries.id),
      ),
    )
    .where(eq(profileEnquiries.id, enquiryId))
    .limit(1);
  return row ?? null;
}
