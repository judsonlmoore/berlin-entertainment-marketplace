import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { assertNoHardCalendarConflict } from "@/src/db/queries/calendar-ops";
import { upsertBookingCalendarEntry } from "@/src/db/queries/calendar";
import {
  auditEvents,
  bookings,
  entertainerProfiles,
  profileEnquiries,
  venues,
} from "@/src/db/schema/marketplace";
import { canTransitionBooking, type BookingState } from "@/src/domain/booking";
import type { ActorContext } from "@/src/domain/permissions";
import { AppError } from "@/src/domain/errors";
import {
  PROFILE_ENQUIRY_PASS_COOLDOWN_DAYS,
  PROFILE_ENQUIRY_REQUEST_COOLDOWN_DAYS,
  enquiryRequestCooldownDaysRemaining,
} from "@/src/domain/profile-enquiry-cooldown";

export {
  PROFILE_ENQUIRY_PASS_COOLDOWN_DAYS,
  PROFILE_ENQUIRY_REQUEST_COOLDOWN_DAYS,
};

const ACTIVE_ENQUIRY_STATES = ["pending", "interested"] as const;

export async function findActiveProfileEnquiry(input: {
  venueId: string;
  entertainerProfileId: string;
}) {
  const db = getDb();
  return db.query.profileEnquiries.findFirst({
    where: and(
      eq(profileEnquiries.venueId, input.venueId),
      eq(profileEnquiries.entertainerProfileId, input.entertainerProfileId),
      inArray(profileEnquiries.state, [...ACTIVE_ENQUIRY_STATES]),
    ),
  });
}

export async function findRecentPassedEnquiry(input: {
  venueId: string;
  entertainerProfileId: string;
  withinDays?: number;
}) {
  const db = getDb();
  const days = input.withinDays ?? PROFILE_ENQUIRY_PASS_COOLDOWN_DAYS;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [row] = await db
    .select()
    .from(profileEnquiries)
    .where(
      and(
        eq(profileEnquiries.venueId, input.venueId),
        eq(profileEnquiries.entertainerProfileId, input.entertainerProfileId),
        eq(profileEnquiries.state, "passed"),
        sql`${profileEnquiries.updatedAt} >= ${since}`,
      ),
    )
    .orderBy(desc(profileEnquiries.updatedAt))
    .limit(1);
  return row ?? null;
}

/** Most recent enquiry for the pair (any state), optionally within a window. */
export async function findRecentProfileEnquiry(input: {
  venueId: string;
  entertainerProfileId: string;
  withinDays?: number;
}) {
  const db = getDb();
  const conditions = [
    eq(profileEnquiries.venueId, input.venueId),
    eq(profileEnquiries.entertainerProfileId, input.entertainerProfileId),
  ];
  if (input.withinDays != null) {
    const since = new Date(Date.now() - input.withinDays * 24 * 60 * 60 * 1000);
    conditions.push(sql`${profileEnquiries.createdAt} >= ${since}`);
  }
  const [row] = await db
    .select()
    .from(profileEnquiries)
    .where(and(...conditions))
    .orderBy(desc(profileEnquiries.createdAt))
    .limit(1);
  return row ?? null;
}

export type VenueActConnectionStatus = {
  venueId: string;
  activeBookingId: string | null;
  /** Whole days left before another request is allowed; null if not on cooldown. */
  cooldownDaysRemaining: number | null;
};

/**
 * Per-venue connection status for a talent profile (active lead + 7-day request cooldown).
 */
export async function listVenueActConnectionStatuses(input: {
  entertainerProfileId: string;
  venueIds: string[];
}): Promise<VenueActConnectionStatus[]> {
  if (input.venueIds.length === 0) return [];

  const db = getDb();
  const rows = await db
    .select({
      venueId: profileEnquiries.venueId,
      state: profileEnquiries.state,
      createdAt: profileEnquiries.createdAt,
      bookingId: bookings.id,
    })
    .from(profileEnquiries)
    .leftJoin(
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
      ),
    )
    .orderBy(desc(profileEnquiries.createdAt));

  const byVenue = new Map<
    string,
    { latestCreatedAt: Date; activeBookingId: string | null }
  >();

  for (const row of rows) {
    const existing = byVenue.get(row.venueId);
    if (!existing) {
      byVenue.set(row.venueId, {
        latestCreatedAt: row.createdAt,
        activeBookingId:
          ACTIVE_ENQUIRY_STATES.includes(
            row.state as (typeof ACTIVE_ENQUIRY_STATES)[number],
          ) && row.bookingId
            ? row.bookingId
            : null,
      });
      continue;
    }
    if (
      !existing.activeBookingId &&
      ACTIVE_ENQUIRY_STATES.includes(
        row.state as (typeof ACTIVE_ENQUIRY_STATES)[number],
      ) &&
      row.bookingId
    ) {
      existing.activeBookingId = row.bookingId;
    }
  }

  const now = new Date();
  return input.venueIds.map((venueId) => {
    const status = byVenue.get(venueId);
    if (!status) {
      return { venueId, activeBookingId: null, cooldownDaysRemaining: null };
    }
    const daysRemaining = enquiryRequestCooldownDaysRemaining(
      status.latestCreatedAt,
      now,
    );
    return {
      venueId,
      activeBookingId: status.activeBookingId,
      cooldownDaysRemaining: daysRemaining > 0 ? daysRemaining : null,
    };
  });
}

export async function submitProfileEnquiry(input: {
  actor: ActorContext;
  venueId: string;
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
    ...(input.note !== undefined ? { note: input.note } : {}),
    bookingState: "applied",
    auditAction: "profile_enquiry.submitted",
  });
}

/**
 * Venue-initiated undated connection request (mirror of profile enquiry).
 * Act responds Interested / Pass; Interest unlocks contacts.
 */
export async function sendVenueConnectionRequest(input: {
  actor: ActorContext;
  venueId: string;
  entertainerProfileId: string;
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
      "Publish your venue profile before requesting a connection",
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
    ...(input.note !== undefined ? { note: input.note } : {}),
    bookingState: "requested",
    auditAction: "profile_enquiry.connection_requested",
  });
}

async function createProfileEnquiry(input: {
  actorUserId: string;
  venueId: string;
  entertainerProfileId: string;
  note?: string;
  bookingState: "applied" | "requested";
  auditAction: string;
}): Promise<{ enquiryId: string; bookingId: string }> {
  const db = getDb();

  const existing = await findActiveProfileEnquiry({
    venueId: input.venueId,
    entertainerProfileId: input.entertainerProfileId,
  });
  if (existing) {
    const booking = await db.query.bookings.findFirst({
      where: and(
        eq(bookings.originType, "profile_enquiry"),
        eq(bookings.originId, existing.id),
      ),
      columns: { id: true },
    });
    if (booking) {
      return { enquiryId: existing.id, bookingId: booking.id };
    }
    throw new AppError("conflict", "An active enquiry already exists");
  }

  const recent = await findRecentProfileEnquiry({
    venueId: input.venueId,
    entertainerProfileId: input.entertainerProfileId,
    withinDays: PROFILE_ENQUIRY_REQUEST_COOLDOWN_DAYS,
  });
  if (recent) {
    throw new AppError(
      "conflict",
      `A connection was already requested. Try again after ${PROFILE_ENQUIRY_REQUEST_COOLDOWN_DAYS} days.`,
    );
  }

  const passed = await findRecentPassedEnquiry({
    venueId: input.venueId,
    entertainerProfileId: input.entertainerProfileId,
  });
  if (passed) {
    throw new AppError(
      "conflict",
      "A recent pass blocks a new connection. Try again after the cooldown.",
    );
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

  // Act→venue pending uses applied→shortlisted/rejected;
  // venue→act connection uses requested→accepted/declined.
  const nextBookingState: BookingState =
    input.decision === "interested"
      ? initiatedByAct
        ? "shortlisted"
        : "accepted"
      : initiatedByAct
        ? "rejected"
        : "declined";
  if (!canTransitionBooking(booking.state as BookingState, nextBookingState)) {
    throw new AppError(
      "invalid_transition",
      `Cannot move booking from ${booking.state} to ${nextBookingState}`,
    );
  }

  const { settleMatchAcceptance } =
    await import("@/src/db/queries/match-settlement");

  await db.transaction(async (tx) => {
    await tx
      .update(profileEnquiries)
      .set({
        state: input.decision === "interested" ? "interested" : "passed",
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

    if (input.decision === "interested") {
      await settleMatchAcceptance(tx, {
        entertainerProfileId: enquiry.entertainerProfileId,
        entertainerUserId: profile.userId,
        venueId: enquiry.venueId,
        startsAt: enquiry.proposedStartsAt,
        endsAt: enquiry.proposedEndsAt,
        reason: "profile_enquiry_interested",
        origin: {
          bookingId: booking.id,
          profileEnquiryId: enquiry.id,
        },
      });
    }

    await tx.insert(auditEvents).values({
      actorUserId: input.actor.userId,
      action:
        input.decision === "interested"
          ? "profile_enquiry.interested"
          : "profile_enquiry.passed",
      subjectType: "profile_enquiry",
      subjectId: enquiry.id,
      metadata: { bookingId: booking.id },
    });
  });

  return { bookingId: booking.id };
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
