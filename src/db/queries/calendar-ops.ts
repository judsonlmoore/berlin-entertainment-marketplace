import { and, eq, isNotNull, lte } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { calendarEntries, venues } from "@/src/db/schema/marketplace";
import { AppError } from "@/src/domain/errors";
import {
  ensureDefaultVenueSpace,
  findOverlappingBlockingEntries,
  getPrimaryVenueSpaceId,
} from "@/src/db/queries/calendar";

/** Rejects overlapping blocking calendar entries for both booking resources. */
export async function assertNoHardCalendarConflict(input: {
  entertainerProfileId: string;
  venueId: string;
  startsAt: Date;
  endsAt: Date;
  excludeBookingId?: string;
  now?: Date;
}) {
  const venue = await getDb().query.venues.findFirst({
    where: eq(venues.id, input.venueId),
  });
  if (!venue) {
    throw new AppError("not_found", "Venue not found");
  }

  let spaceId = await getPrimaryVenueSpaceId(input.venueId);
  if (!spaceId) {
    const space = await ensureDefaultVenueSpace(input.venueId, venue.name);
    spaceId = space.id;
  }

  const entertainerConflicts = await findOverlappingBlockingEntries({
    ownerType: "entertainer",
    ownerId: input.entertainerProfileId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    ...(input.excludeBookingId
      ? { excludeBookingId: input.excludeBookingId }
      : {}),
    ...(input.now ? { now: input.now } : {}),
  });
  const venueConflicts = await findOverlappingBlockingEntries({
    ownerType: "venue_space",
    ownerId: spaceId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    ...(input.excludeBookingId
      ? { excludeBookingId: input.excludeBookingId }
      : {}),
    ...(input.now ? { now: input.now } : {}),
  });

  if (entertainerConflicts.length + venueConflicts.length > 0) {
    throw new AppError(
      "conflict",
      "Calendar conflict blocks this booking action",
      {
        conflictIds: [...entertainerConflicts, ...venueConflicts].map(
          (row) => row.id,
        ),
      },
    );
  }

  return { spaceId };
}

/**
 * Idempotent hold expiry: expired holds stop blocking on read already;
 * reconciliation clears them back to available with a single conditional update.
 */
export async function expireStaleHolds(input?: {
  now?: Date;
  actorUserId?: string | null;
}) {
  const now = input?.now ?? new Date();
  const db = getDb();
  const expiredRows = await db
    .update(calendarEntries)
    .set({
      state: "available",
      holdExpiresAt: null,
      updatedAt: now,
      sourceType: "hold_expiry",
    })
    .where(
      and(
        eq(calendarEntries.state, "tentative_hold"),
        isNotNull(calendarEntries.holdExpiresAt),
        lte(calendarEntries.holdExpiresAt, now),
      ),
    )
    .returning({ id: calendarEntries.id });

  return { expired: expiredRows.length, checkedAt: now };
}
