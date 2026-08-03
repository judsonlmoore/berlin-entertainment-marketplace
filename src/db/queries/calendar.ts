import { and, eq, gte, lt, or } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  calendarEntries,
  entertainerProfiles,
  venueMemberships,
  venueSpaces,
  venues,
} from "@/src/db/schema/marketplace";
import {
  isBlockingCalendarState,
  type CalendarOwnerType,
} from "@/src/domain/calendar";

export async function listCalendarResourcesForUser(userId: string) {
  const db = getDb();
  const entertainer = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.userId, userId),
  });

  const spaces = await db
    .select({
      spaceId: venueSpaces.id,
      spaceName: venueSpaces.name,
      venueId: venues.id,
      venueName: venues.name,
    })
    .from(venueMemberships)
    .innerJoin(venues, eq(venues.id, venueMemberships.venueId))
    .innerJoin(venueSpaces, eq(venueSpaces.venueId, venues.id))
    .where(
      and(
        eq(venueMemberships.userId, userId),
        eq(venueMemberships.status, "active"),
      ),
    );

  // Venues with membership but no space yet — caller can ensureDefaultVenueSpace.
  const venuesWithoutSpace = await db
    .select({
      venueId: venues.id,
      venueName: venues.name,
    })
    .from(venueMemberships)
    .innerJoin(venues, eq(venues.id, venueMemberships.venueId))
    .leftJoin(venueSpaces, eq(venueSpaces.venueId, venues.id))
    .where(
      and(
        eq(venueMemberships.userId, userId),
        eq(venueMemberships.status, "active"),
      ),
    );

  const missing = venuesWithoutSpace.filter(
    (row, index, all) =>
      !spaces.some((s) => s.venueId === row.venueId) &&
      all.findIndex((r) => r.venueId === row.venueId) === index,
  );

  return {
    entertainer: entertainer
      ? { id: entertainer.id, name: entertainer.actName }
      : null,
    spaces,
    venuesNeedingSpace: missing,
  };
}

export async function ensureDefaultVenueSpace(
  venueId: string,
  venueName: string,
) {
  const db = getDb();
  const existing = await db.query.venueSpaces.findFirst({
    where: eq(venueSpaces.venueId, venueId),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(venueSpaces)
    .values({
      venueId,
      name: `${venueName} — Main room`,
      capacity: 50,
      productionResources: {},
    })
    .returning();
  if (!created) {
    throw new Error("Failed to create venue space");
  }
  return created;
}

export async function listCalendarEntriesInRange(input: {
  ownerType: CalendarOwnerType;
  ownerId: string;
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const db = getDb();
  return db
    .select()
    .from(calendarEntries)
    .where(
      and(
        eq(calendarEntries.ownerType, input.ownerType),
        eq(calendarEntries.ownerId, input.ownerId),
        lt(calendarEntries.startsAt, input.rangeEnd),
        gte(calendarEntries.endsAt, input.rangeStart),
      ),
    )
    .orderBy(calendarEntries.startsAt);
}

export async function findOverlappingBlockingEntries(input: {
  ownerType: CalendarOwnerType;
  ownerId: string;
  startsAt: Date;
  endsAt: Date;
  excludeId?: string;
  excludeBookingId?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const db = getDb();
  const rows = await db
    .select()
    .from(calendarEntries)
    .where(
      and(
        eq(calendarEntries.ownerType, input.ownerType),
        eq(calendarEntries.ownerId, input.ownerId),
        lt(calendarEntries.startsAt, input.endsAt),
        gte(calendarEntries.endsAt, input.startsAt),
        or(
          eq(calendarEntries.state, "confirmed"),
          eq(calendarEntries.state, "requested"),
          eq(calendarEntries.state, "unavailable"),
          eq(calendarEntries.state, "tentative_hold"),
        ),
      ),
    );

  return rows.filter(
    (row) =>
      row.id !== input.excludeId &&
      row.bookingId !== input.excludeBookingId &&
      isBlockingCalendarState(row.state, row.holdExpiresAt, now),
  );
}

/** Used inside booking transactions — pass drizzle tx client. */
export async function upsertBookingCalendarEntry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  input: {
    ownerType: CalendarOwnerType;
    ownerId: string;
    startsAt: Date;
    endsAt: Date;
    state: "requested" | "confirmed";
    bookingId: string;
  },
) {
  await tx
    .delete(calendarEntries)
    .where(
      and(
        eq(calendarEntries.bookingId, input.bookingId),
        eq(calendarEntries.ownerType, input.ownerType),
        eq(calendarEntries.ownerId, input.ownerId),
      ),
    );

  const [created] = await tx
    .insert(calendarEntries)
    .values({
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      displayTimezone: "Europe/Berlin",
      state: input.state,
      bookingId: input.bookingId,
      sourceType: "booking",
      sourceId: input.bookingId,
    })
    .returning();
  return created;
}

export async function clearBookingCalendarEntries(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  bookingId: string,
) {
  await tx
    .delete(calendarEntries)
    .where(eq(calendarEntries.bookingId, bookingId));
}

export async function getPrimaryVenueSpaceId(venueId: string) {
  const db = getDb();
  const space = await db.query.venueSpaces.findFirst({
    where: eq(venueSpaces.venueId, venueId),
  });
  return space?.id ?? null;
}
