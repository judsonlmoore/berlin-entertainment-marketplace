import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { assertNoHardCalendarConflict } from "@/src/db/queries/calendar-ops";
import { upsertBookingCalendarEntry } from "@/src/db/queries/calendar";
import {
  auditEvents,
  bookings,
  entertainerProfiles,
  profileEnquiries,
  venueMemberships,
  venues,
} from "@/src/db/schema/marketplace";
import { canTransitionBooking, type BookingState } from "@/src/domain/booking";
import type { ActorContext } from "@/src/domain/permissions";
import { AppError } from "@/src/domain/errors";

export const PROFILE_ENQUIRY_PASS_COOLDOWN_DAYS = 30;

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

  const existing = await findActiveProfileEnquiry({
    venueId: input.venueId,
    entertainerProfileId: profile.id,
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

  const passed = await findRecentPassedEnquiry({
    venueId: input.venueId,
    entertainerProfileId: profile.id,
  });
  if (passed) {
    throw new AppError(
      "conflict",
      "This venue passed recently. Try again after the cooldown.",
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
        entertainerProfileId: profile.id,
        submittedByUserId: input.actor.userId,
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
        entertainerProfileId: profile.id,
        state: "applied",
      })
      .returning({ id: bookings.id });
    if (!booking) throw new AppError("conflict", "Could not create lead");
    bookingId = booking.id;

    await tx.insert(auditEvents).values({
      actorUserId: input.actor.userId,
      action: "profile_enquiry.submitted",
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

  if (
    !input.actor.venueMemberships.some(
      (m) =>
        m.venueId === enquiry.venueId &&
        m.status === "active" &&
        (m.role === "owner" || m.role === "member"),
    )
  ) {
    throw new AppError("forbidden", "Not a venue operator for this enquiry");
  }

  if (enquiry.state !== "pending") {
    throw new AppError("invalid_transition", "Enquiry is no longer pending");
  }

  const booking = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.originType, "profile_enquiry"),
      eq(bookings.originId, enquiry.id),
    ),
  });
  if (!booking) throw new AppError("not_found", "Lead not found");

  const nextBookingState: BookingState =
    input.decision === "interested" ? "shortlisted" : "rejected";
  if (!canTransitionBooking(booking.state as BookingState, nextBookingState)) {
    throw new AppError(
      "invalid_transition",
      `Cannot move booking from ${booking.state} to ${nextBookingState}`,
    );
  }

  const profile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.id, enquiry.entertainerProfileId),
    columns: { userId: true },
  });
  if (!profile) throw new AppError("not_found", "Act profile not found");

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
  const isVenue = input.actor.venueMemberships.some(
    (m) => m.venueId === enquiry.venueId && m.status === "active",
  );
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
        ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
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

/** Venue operators who should receive enquiry notifications. */
export async function listVenueOperatorUserIds(venueId: string) {
  const db = getDb();
  const rows = await db
    .select({ userId: venueMemberships.userId })
    .from(venueMemberships)
    .where(
      and(
        eq(venueMemberships.venueId, venueId),
        eq(venueMemberships.status, "active"),
      ),
    );
  return rows.map((r) => r.userId);
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
