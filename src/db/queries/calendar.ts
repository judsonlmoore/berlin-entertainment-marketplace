import { and, eq, gte, inArray, isNotNull, lt, or } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  calendarEntries,
  calendarRecurrenceExceptions,
  entertainerProfiles,
  venueMemberships,
  venueSpaces,
  venues,
} from "@/src/db/schema/marketplace";
import {
  isBlockingCalendarState,
  type CalendarOwnerType,
} from "@/src/domain/calendar";
import { expandRecurringOccurrences } from "@/src/domain/calendar-recurrence";

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

export type CalendarEntryView = typeof calendarEntries.$inferSelect & {
  /** Synthetic id for expanded recurrence instances. */
  occurrenceId?: string;
};

export async function listCalendarEntriesInRange(input: {
  ownerType: CalendarOwnerType;
  ownerId: string;
  rangeStart: Date;
  rangeEnd: Date;
}): Promise<CalendarEntryView[]> {
  const db = getDb();
  const rows = await db
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

  const recurringParents = await db
    .select()
    .from(calendarEntries)
    .where(
      and(
        eq(calendarEntries.ownerType, input.ownerType),
        eq(calendarEntries.ownerId, input.ownerId),
        isNotNull(calendarEntries.recurrenceRule),
      ),
    );

  const parentIds = recurringParents.map((p) => p.id);
  const exceptions =
    parentIds.length === 0
      ? []
      : await db
          .select()
          .from(calendarRecurrenceExceptions)
          .where(
            inArray(calendarRecurrenceExceptions.parentEntryId, parentIds),
          );

  const exByParent = new Map<string, Date[]>();
  for (const ex of exceptions) {
    if (ex.kind !== "skip") continue;
    const list = exByParent.get(ex.parentEntryId) ?? [];
    list.push(ex.exceptionStartsAt);
    exByParent.set(ex.parentEntryId, list);
  }

  const expanded: CalendarEntryView[] = [];
  const recurringIds = new Set(recurringParents.map((p) => p.id));

  for (const row of rows) {
    if (row.recurrenceRule) continue;
    expanded.push(row);
  }

  for (const parent of recurringParents) {
    if (!parent.recurrenceRule) continue;
    const occurrences = expandRecurringOccurrences({
      startsAt: parent.startsAt,
      endsAt: parent.endsAt,
      recurrenceRule: parent.recurrenceRule,
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      exdates: exByParent.get(parent.id) ?? [],
    });
    for (const occ of occurrences) {
      expanded.push({
        ...parent,
        startsAt: occ.startsAt,
        endsAt: occ.endsAt,
        occurrenceId: `${parent.id}:${occ.startsAt.toISOString()}`,
      });
    }
  }

  // Drop non-expanded parents that only appeared because their seed window overlapped.
  void recurringIds;

  return expanded.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
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
        or(
          eq(calendarEntries.state, "confirmed"),
          eq(calendarEntries.state, "requested"),
          eq(calendarEntries.state, "unavailable"),
          eq(calendarEntries.state, "tentative_hold"),
        ),
      ),
    );

  const candidates: Array<(typeof rows)[number]> = [];

  for (const row of rows) {
    if (row.id === input.excludeId) continue;
    if (row.bookingId && row.bookingId === input.excludeBookingId) continue;
    if (!isBlockingCalendarState(row.state, row.holdExpiresAt, now)) continue;

    if (row.recurrenceRule) {
      const occurrences = expandRecurringOccurrences({
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        recurrenceRule: row.recurrenceRule,
        rangeStart: input.startsAt,
        rangeEnd: input.endsAt,
      });
      if (occurrences.length > 0) {
        candidates.push(row);
      }
      continue;
    }

    if (
      row.startsAt.getTime() < input.endsAt.getTime() &&
      row.endsAt.getTime() > input.startsAt.getTime()
    ) {
      candidates.push(row);
    }
  }

  return candidates;
}

/**
 * Batch busy check for entertainer profiles over a window.
 * Returns profile ids that have at least one blocking overlap (incl. RRULE).
 */
export async function listBusyEntertainerProfileIds(input: {
  profileIds: string[];
  startsAt: Date;
  endsAt: Date;
  now?: Date;
}): Promise<Set<string>> {
  const busy = new Set<string>();
  if (input.profileIds.length === 0) return busy;

  const now = input.now ?? new Date();
  const db = getDb();
  const rows = await db
    .select()
    .from(calendarEntries)
    .where(
      and(
        eq(calendarEntries.ownerType, "entertainer"),
        inArray(calendarEntries.ownerId, input.profileIds),
        or(
          eq(calendarEntries.state, "confirmed"),
          eq(calendarEntries.state, "requested"),
          eq(calendarEntries.state, "unavailable"),
          eq(calendarEntries.state, "tentative_hold"),
        ),
      ),
    );

  for (const row of rows) {
    if (busy.has(row.ownerId)) continue;
    if (!isBlockingCalendarState(row.state, row.holdExpiresAt, now)) continue;

    if (row.recurrenceRule) {
      const occurrences = expandRecurringOccurrences({
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        recurrenceRule: row.recurrenceRule,
        rangeStart: input.startsAt,
        rangeEnd: input.endsAt,
      });
      if (occurrences.length > 0) busy.add(row.ownerId);
      continue;
    }

    if (
      row.startsAt.getTime() < input.endsAt.getTime() &&
      row.endsAt.getTime() > input.startsAt.getTime()
    ) {
      busy.add(row.ownerId);
    }
  }

  return busy;
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
