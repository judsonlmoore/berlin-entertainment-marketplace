import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  applications,
  bookingTerms,
  bookings,
  directRequests,
  entertainerProfiles,
  opportunities,
  profileEnquiries,
  venues,
} from "@/src/db/schema/marketplace";
import type { BookingState } from "@/src/domain/booking";
import {
  projectLeadStatus,
  type LeadOriginChannel,
  type LeadStatus,
} from "@/src/domain/lead";
import type { ActorContext } from "@/src/domain/permissions";

export type LeadListItem = {
  bookingId: string;
  originType: LeadOriginChannel;
  originId: string;
  venueId: string;
  venueName: string;
  entertainerProfileId: string;
  actName: string;
  bookingState: BookingState;
  leadStatus: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
  performanceStartsAt: Date | null;
  performanceEndsAt: Date | null;
  direction: "incoming" | "outgoing";
  summary: string | null;
};

async function latestTermsByBooking(bookingIds: string[]) {
  if (bookingIds.length === 0)
    return new Map<string, { startsAt: Date; endsAt: Date }>();
  const db = getDb();
  const rows = await db
    .select({
      bookingId: bookingTerms.bookingId,
      startsAt: bookingTerms.startsAt,
      endsAt: bookingTerms.endsAt,
      version: bookingTerms.version,
    })
    .from(bookingTerms)
    .where(inArray(bookingTerms.bookingId, bookingIds))
    .orderBy(desc(bookingTerms.version));

  const map = new Map<string, { startsAt: Date; endsAt: Date }>();
  for (const row of rows) {
    if (!map.has(row.bookingId)) {
      map.set(row.bookingId, { startsAt: row.startsAt, endsAt: row.endsAt });
    }
  }
  return map;
}

/**
 * Unified lead inbox for a member: bookings from applications, direct
 * requests, and profile enquiries they are a party to.
 */
export async function listLeadsForActor(
  actor: ActorContext,
  filter?: { status?: LeadStatus | "all" },
): Promise<LeadListItem[]> {
  const db = getDb();
  const venueIds = actor.venueMemberships
    .filter((m) => m.status === "active")
    .map((m) => m.venueId);

  const profile = actor.roles.includes("entertainer")
    ? await db.query.entertainerProfiles.findFirst({
        where: eq(entertainerProfiles.userId, actor.userId),
        columns: { id: true },
      })
    : null;

  const partyFilters = [];
  if (profile) {
    partyFilters.push(eq(bookings.entertainerProfileId, profile.id));
  }
  if (venueIds.length > 0) {
    partyFilters.push(inArray(bookings.venueId, venueIds));
  }
  if (partyFilters.length === 0 && !actor.isPlatformStaff) {
    return [];
  }

  const rows = await db
    .select({
      bookingId: bookings.id,
      originType: bookings.originType,
      originId: bookings.originId,
      venueId: bookings.venueId,
      venueName: venues.name,
      entertainerProfileId: bookings.entertainerProfileId,
      actName: entertainerProfiles.actName,
      bookingState: bookings.state,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
    })
    .from(bookings)
    .innerJoin(venues, eq(venues.id, bookings.venueId))
    .innerJoin(
      entertainerProfiles,
      eq(entertainerProfiles.id, bookings.entertainerProfileId),
    )
    .where(
      actor.isPlatformStaff
        ? undefined
        : partyFilters.length === 1
          ? partyFilters[0]
          : or(...partyFilters),
    )
    .orderBy(desc(bookings.updatedAt));

  const bookingIds = rows.map((r) => r.bookingId);
  const termsMap = await latestTermsByBooking(bookingIds);

  const applicationIds = rows
    .filter((r) => r.originType === "application")
    .map((r) => r.originId);
  const directIds = rows
    .filter((r) => r.originType === "direct_request")
    .map((r) => r.originId);
  const enquiryIds = rows
    .filter((r) => r.originType === "profile_enquiry")
    .map((r) => r.originId);

  const [apps, drs, enquiries] = await Promise.all([
    applicationIds.length
      ? db
          .select({
            id: applications.id,
            opportunityId: applications.opportunityId,
            message: applications.message,
          })
          .from(applications)
          .where(inArray(applications.id, applicationIds))
      : Promise.resolve([]),
    directIds.length
      ? db
          .select({
            id: directRequests.id,
            startsAt: directRequests.startsAt,
            endsAt: directRequests.endsAt,
            notes: directRequests.notes,
            formatCategory: directRequests.formatCategory,
          })
          .from(directRequests)
          .where(inArray(directRequests.id, directIds))
      : Promise.resolve([]),
    enquiryIds.length
      ? db
          .select({
            id: profileEnquiries.id,
            note: profileEnquiries.note,
            proposedStartsAt: profileEnquiries.proposedStartsAt,
            proposedEndsAt: profileEnquiries.proposedEndsAt,
            proposedFormat: profileEnquiries.proposedFormat,
          })
          .from(profileEnquiries)
          .where(inArray(profileEnquiries.id, enquiryIds))
      : Promise.resolve([]),
  ]);

  const oppIds = apps.map((a) => a.opportunityId);
  const opportunityRows =
    oppIds.length > 0
      ? await db
          .select({
            id: opportunities.id,
            title: opportunities.title,
            startsAt: opportunities.startsAt,
            endsAt: opportunities.endsAt,
          })
          .from(opportunities)
          .where(inArray(opportunities.id, oppIds))
      : [];

  const appMap = new Map(apps.map((a) => [a.id, a]));
  const drMap = new Map(drs.map((d) => [d.id, d]));
  const enquiryMap = new Map(enquiries.map((e) => [e.id, e]));
  const oppMap = new Map(opportunityRows.map((o) => [o.id, o]));

  const actProfileId = profile?.id;
  const venueIdSet = new Set(venueIds);

  const items: LeadListItem[] = rows.map((row) => {
    const terms = termsMap.get(row.bookingId);
    let performanceStartsAt: Date | null = terms?.startsAt ?? null;
    let performanceEndsAt: Date | null = terms?.endsAt ?? null;
    let summary: string | null = null;

    if (row.originType === "application") {
      const app = appMap.get(row.originId);
      const opp = app ? oppMap.get(app.opportunityId) : null;
      if (opp) {
        performanceStartsAt = performanceStartsAt ?? opp.startsAt;
        performanceEndsAt = performanceEndsAt ?? opp.endsAt;
        summary = opp.title;
      } else if (app?.message) {
        summary = app.message.slice(0, 120);
      }
    } else if (row.originType === "direct_request") {
      const dr = drMap.get(row.originId);
      if (dr) {
        performanceStartsAt = performanceStartsAt ?? dr.startsAt;
        performanceEndsAt = performanceEndsAt ?? dr.endsAt;
        summary = dr.formatCategory || dr.notes;
      }
    } else if (row.originType === "profile_enquiry") {
      const enq = enquiryMap.get(row.originId);
      if (enq) {
        performanceStartsAt = performanceStartsAt ?? enq.proposedStartsAt;
        performanceEndsAt = performanceEndsAt ?? enq.proposedEndsAt;
        summary = enq.proposedFormat || enq.note;
      }
    }

    const bookingState = row.bookingState as BookingState;
    const leadStatus = projectLeadStatus({
      bookingState,
      performanceEndsAt,
    });

    let direction: "incoming" | "outgoing" = "outgoing";
    if (
      row.originType === "profile_enquiry" ||
      row.originType === "application"
    ) {
      // Act initiated → venue receives
      direction = venueIdSet.has(row.venueId) ? "incoming" : "outgoing";
    } else {
      // Venue initiated DR → act receives
      direction =
        actProfileId && row.entertainerProfileId === actProfileId
          ? "incoming"
          : "outgoing";
    }

    return {
      bookingId: row.bookingId,
      originType: row.originType as LeadOriginChannel,
      originId: row.originId,
      venueId: row.venueId,
      venueName: row.venueName,
      entertainerProfileId: row.entertainerProfileId,
      actName: row.actName,
      bookingState,
      leadStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      performanceStartsAt,
      performanceEndsAt,
      direction,
      summary,
    };
  });

  const statusFilter = filter?.status ?? "all";
  if (statusFilter === "all") return items;
  return items.filter((item) => item.leadStatus === statusFilter);
}

export async function getLeadByBookingId(input: {
  bookingId: string;
  actor: ActorContext;
}) {
  const db = getDb();
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, input.bookingId),
  });
  if (!booking) return null;

  const venueIds = input.actor.venueMemberships
    .filter((m) => m.status === "active")
    .map((m) => m.venueId);
  const profile = input.actor.roles.includes("entertainer")
    ? await db.query.entertainerProfiles.findFirst({
        where: eq(entertainerProfiles.userId, input.actor.userId),
        columns: { id: true },
      })
    : null;

  const isParty =
    input.actor.isPlatformStaff ||
    (profile && booking.entertainerProfileId === profile.id) ||
    venueIds.includes(booking.venueId);
  if (!isParty) return null;

  const [venue, act] = await Promise.all([
    db.query.venues.findFirst({
      where: eq(venues.id, booking.venueId),
      columns: { id: true, name: true, district: true },
    }),
    db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.id, booking.entertainerProfileId),
      columns: { id: true, actName: true, userId: true },
    }),
  ]);

  let originDetail: Record<string, unknown> = {};
  if (booking.originType === "profile_enquiry") {
    const enq = await db.query.profileEnquiries.findFirst({
      where: eq(profileEnquiries.id, booking.originId),
    });
    originDetail = { enquiry: enq };
  } else if (booking.originType === "direct_request") {
    const dr = await db.query.directRequests.findFirst({
      where: eq(directRequests.id, booking.originId),
    });
    originDetail = { directRequest: dr };
  } else if (booking.originType === "application") {
    const app = await db.query.applications.findFirst({
      where: eq(applications.id, booking.originId),
    });
    const opp = app
      ? await db.query.opportunities.findFirst({
          where: eq(opportunities.id, app.opportunityId),
        })
      : null;
    originDetail = { application: app, opportunity: opp };
  }

  const terms = await latestTermsByBooking([booking.id]);
  const performanceEndsAt = terms.get(booking.id)?.endsAt ?? null;
  const performanceStartsAt = terms.get(booking.id)?.startsAt ?? null;

  // Prefer enquiry proposal dates when no terms yet
  if (
    booking.originType === "profile_enquiry" &&
    originDetail.enquiry &&
    typeof originDetail.enquiry === "object"
  ) {
    const enq = originDetail.enquiry as {
      proposedStartsAt?: Date | null;
      proposedEndsAt?: Date | null;
    };
    if (!performanceStartsAt && enq.proposedStartsAt) {
      // leave as proposal in originDetail; projection uses them below
    }
  }

  const enquiry =
    booking.originType === "profile_enquiry"
      ? (originDetail.enquiry as {
          proposedStartsAt?: Date | null;
          proposedEndsAt?: Date | null;
        } | null)
      : null;

  const leadStatus = projectLeadStatus({
    bookingState: booking.state as BookingState,
    performanceEndsAt:
      performanceEndsAt ??
      enquiry?.proposedEndsAt ??
      (booking.originType === "direct_request"
        ? ((originDetail.directRequest as { endsAt?: Date } | undefined)
            ?.endsAt ?? null)
        : booking.originType === "application"
          ? ((originDetail.opportunity as { endsAt?: Date } | undefined)
              ?.endsAt ?? null)
          : null),
  });

  return {
    booking,
    venue,
    act,
    originDetail,
    leadStatus,
    performanceStartsAt:
      performanceStartsAt ?? enquiry?.proposedStartsAt ?? null,
    performanceEndsAt: performanceEndsAt ?? enquiry?.proposedEndsAt ?? null,
  };
}
