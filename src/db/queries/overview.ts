import { and, count, desc, eq, inArray, ne, or } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  applications,
  bookings,
  directRequests,
  entertainerProfiles,
  marketplaceAccounts,
  opportunities,
  venues,
} from "@/src/db/schema/marketplace";
import type { ActorContext } from "@/src/domain/permissions";

export async function countApprovedMembers() {
  const db = getDb();
  const [row] = await db
    .select({ value: count() })
    .from(marketplaceAccounts)
    .where(eq(marketplaceAccounts.accountStatus, "active"));
  return row?.value ?? 0;
}

function bookingPartyFilter(input: {
  venueIds: string[];
  entertainerProfileId: string | null;
}) {
  const parts = [];
  if (input.venueIds.length > 0) {
    parts.push(inArray(bookings.venueId, input.venueIds));
  }
  if (input.entertainerProfileId) {
    parts.push(eq(bookings.entertainerProfileId, input.entertainerProfileId));
  }
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0]!;
  return or(...parts);
}

export async function getOverviewMetrics(actor: ActorContext) {
  const db = getDb();
  const venueIds = actor.venueId ? [actor.venueId] : [];

  const entertainer = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.userId, actor.userId),
  });

  let pendingApplications = 0;
  let openOpportunities = 0;
  if (venueIds.length > 0) {
    const [apps] = await db
      .select({ value: count() })
      .from(applications)
      .innerJoin(
        opportunities,
        eq(opportunities.id, applications.opportunityId),
      )
      .where(
        and(
          inArray(opportunities.venueId, venueIds),
          eq(applications.state, "submitted"),
        ),
      );
    pendingApplications = apps?.value ?? 0;

    const [ops] = await db
      .select({ value: count() })
      .from(opportunities)
      .where(
        and(
          inArray(opportunities.venueId, venueIds),
          eq(opportunities.state, "open"),
        ),
      );
    openOpportunities = ops?.value ?? 0;
  }

  let incomingRequests = 0;
  if (entertainer) {
    const [reqs] = await db
      .select({ value: count() })
      .from(directRequests)
      .where(
        and(
          eq(directRequests.entertainerProfileId, entertainer.id),
          eq(directRequests.state, "requested"),
        ),
      );
    incomingRequests = reqs?.value ?? 0;
  }

  let outgoingRequests = 0;
  if (venueIds.length > 0) {
    const [reqs] = await db
      .select({ value: count() })
      .from(directRequests)
      .where(
        and(
          inArray(directRequests.venueId, venueIds),
          eq(directRequests.state, "requested"),
        ),
      );
    outgoingRequests = reqs?.value ?? 0;
  }

  const party = bookingPartyFilter({
    venueIds,
    entertainerProfileId: entertainer?.id ?? null,
  });

  let activeBookings = 0;
  let confirmedBookings = 0;
  if (party) {
    const terminal = and(
      party,
      ne(bookings.state, "cancelled"),
      ne(bookings.state, "declined"),
      ne(bookings.state, "rejected"),
      ne(bookings.state, "withdrawn"),
      ne(bookings.state, "expired"),
    );

    const [active] = await db
      .select({ value: count() })
      .from(bookings)
      .where(and(terminal, ne(bookings.state, "confirmed")));
    activeBookings = active?.value ?? 0;

    const [confirmed] = await db
      .select({ value: count() })
      .from(bookings)
      .where(and(party, eq(bookings.state, "confirmed")));
    confirmedBookings = confirmed?.value ?? 0;
  }

  return {
    pendingApplications,
    openOpportunities,
    pendingRequests: incomingRequests + outgoingRequests,
    incomingRequests,
    outgoingRequests,
    activeBookings,
    confirmedBookings,
    canPostOpportunity: venueIds.length > 0,
    firstVenueId: venueIds[0] ?? null,
    entertainerProfileId: entertainer?.id ?? null,
  };
}

export async function listRecentApplicationsForVenues(
  venueIds: string[],
  limit = 5,
) {
  if (venueIds.length === 0) return [];
  const db = getDb();
  return db
    .select({
      id: applications.id,
      state: applications.state,
      createdAt: applications.createdAt,
      opportunityId: opportunities.id,
      opportunityTitle: opportunities.title,
      actName: entertainerProfiles.actName,
      venueId: venues.id,
    })
    .from(applications)
    .innerJoin(opportunities, eq(opportunities.id, applications.opportunityId))
    .innerJoin(venues, eq(venues.id, opportunities.venueId))
    .innerJoin(
      entertainerProfiles,
      eq(entertainerProfiles.id, applications.entertainerProfileId),
    )
    .where(
      and(
        inArray(opportunities.venueId, venueIds),
        eq(applications.state, "submitted"),
      ),
    )
    .orderBy(desc(applications.createdAt))
    .limit(limit);
}

export async function getNextActiveBooking(input: {
  venueIds: string[];
  entertainerProfileId: string | null;
}) {
  const db = getDb();
  const party = bookingPartyFilter(input);
  if (!party) return null;

  const [row] = await db
    .select({
      id: bookings.id,
      state: bookings.state,
      actName: entertainerProfiles.actName,
      venueName: venues.name,
      district: venues.district,
    })
    .from(bookings)
    .innerJoin(venues, eq(venues.id, bookings.venueId))
    .innerJoin(
      entertainerProfiles,
      eq(entertainerProfiles.id, bookings.entertainerProfileId),
    )
    .where(
      and(
        party,
        ne(bookings.state, "cancelled"),
        ne(bookings.state, "declined"),
        ne(bookings.state, "rejected"),
        ne(bookings.state, "withdrawn"),
        ne(bookings.state, "expired"),
      ),
    )
    .orderBy(desc(bookings.updatedAt))
    .limit(1);

  return row ?? null;
}
