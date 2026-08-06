import { and, count, desc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  applications,
  applicationClarificationNotes,
  entertainerProfiles,
  opportunities,
  venues,
} from "@/src/db/schema/marketplace";

export async function listOpenOpportunities(input?: {
  viewerVenueIds?: string[];
  entertainerProfileId?: string | null;
}) {
  const db = getDb();
  const rows = await db
    .select({
      id: opportunities.id,
      title: opportunities.title,
      startsAt: opportunities.startsAt,
      endsAt: opportunities.endsAt,
      formatCategory: opportunities.formatCategory,
      budgetMinCents: opportunities.budgetMinCents,
      budgetMaxCents: opportunities.budgetMaxCents,
      currency: opportunities.currency,
      actSizeMin: opportunities.actSizeMin,
      actSizeMax: opportunities.actSizeMax,
      applicationDeadline: opportunities.applicationDeadline,
      venueId: venues.id,
      venueName: venues.name,
      district: venues.district,
    })
    .from(opportunities)
    .innerJoin(venues, eq(venues.id, opportunities.venueId))
    .where(eq(opportunities.state, "open"))
    .orderBy(opportunities.startsAt);

  const opportunityIds = rows.map((row) => row.id);
  const countRows =
    opportunityIds.length > 0
      ? await db
          .select({
            opportunityId: applications.opportunityId,
            value: count(),
          })
          .from(applications)
          .where(inArray(applications.opportunityId, opportunityIds))
          .groupBy(applications.opportunityId)
      : [];
  const counts = new Map(
    countRows.map((row) => [row.opportunityId, Number(row.value)]),
  );

  const ownApps =
    input?.entertainerProfileId && opportunityIds.length > 0
      ? await db
          .select({
            opportunityId: applications.opportunityId,
            state: applications.state,
          })
          .from(applications)
          .where(
            and(
              eq(applications.entertainerProfileId, input.entertainerProfileId),
              inArray(applications.opportunityId, opportunityIds),
            ),
          )
      : [];

  const appByOpportunity = new Map(
    ownApps.map((row) => [row.opportunityId, row.state]),
  );
  const ownedVenueIds = new Set(input?.viewerVenueIds ?? []);

  return rows.map((row) => ({
    ...row,
    applicationCount: counts.get(row.id) ?? 0,
    ownApplicationState: appByOpportunity.get(row.id) ?? null,
    canSeeApplicationCount: ownedVenueIds.has(row.venueId),
  }));
}

export async function listVenueOpportunities(venueId: string) {
  const db = getDb();
  return db
    .select()
    .from(opportunities)
    .where(eq(opportunities.venueId, venueId))
    .orderBy(desc(opportunities.createdAt));
}

/** Open calls for a venue (talent-facing venue profile). */
export async function listOpenCallsForVenue(input: {
  venueId: string;
  entertainerProfileId?: string | null;
}) {
  const db = getDb();
  const rows = await db
    .select({
      id: opportunities.id,
      title: opportunities.title,
      startsAt: opportunities.startsAt,
      endsAt: opportunities.endsAt,
      formatCategory: opportunities.formatCategory,
      budgetMinCents: opportunities.budgetMinCents,
      budgetMaxCents: opportunities.budgetMaxCents,
      currency: opportunities.currency,
      applicationDeadline: opportunities.applicationDeadline,
    })
    .from(opportunities)
    .where(
      and(
        eq(opportunities.venueId, input.venueId),
        eq(opportunities.state, "open"),
      ),
    )
    .orderBy(opportunities.startsAt);

  if (!input.entertainerProfileId || rows.length === 0) {
    return rows.map((row) => ({
      ...row,
      ownApplicationState: null as string | null,
    }));
  }

  const ownApps = await db
    .select({
      opportunityId: applications.opportunityId,
      state: applications.state,
    })
    .from(applications)
    .where(
      and(
        eq(applications.entertainerProfileId, input.entertainerProfileId),
        inArray(
          applications.opportunityId,
          rows.map((r) => r.id),
        ),
      ),
    );
  const byOpp = new Map(ownApps.map((a) => [a.opportunityId, a.state]));
  return rows.map((row) => ({
    ...row,
    ownApplicationState: byOpp.get(row.id) ?? null,
  }));
}

export async function getOpportunityDetail(opportunityId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: opportunities.id,
      title: opportunities.title,
      startsAt: opportunities.startsAt,
      endsAt: opportunities.endsAt,
      timezone: opportunities.timezone,
      formatCategory: opportunities.formatCategory,
      expectedAudience: opportunities.expectedAudience,
      budgetMinCents: opportunities.budgetMinCents,
      budgetMaxCents: opportunities.budgetMaxCents,
      currency: opportunities.currency,
      actSizeMin: opportunities.actSizeMin,
      actSizeMax: opportunities.actSizeMax,
      productionContext: opportunities.productionContext,
      applicationDeadline: opportunities.applicationDeadline,
      notes: opportunities.notes,
      state: opportunities.state,
      venueId: venues.id,
      venueName: venues.name,
      district: venues.district,
    })
    .from(opportunities)
    .innerJoin(venues, eq(venues.id, opportunities.venueId))
    .where(eq(opportunities.id, opportunityId))
    .limit(1);
  return row ?? null;
}

export async function listApplicationsForOpportunity(opportunityId: string) {
  const db = getDb();
  return db
    .select({
      id: applications.id,
      state: applications.state,
      message: applications.message,
      quoteMinCents: applications.quoteMinCents,
      quoteMaxCents: applications.quoteMaxCents,
      currency: applications.currency,
      createdAt: applications.createdAt,
      entertainerProfileId: entertainerProfiles.id,
      actName: entertainerProfiles.actName,
      category: entertainerProfiles.category,
    })
    .from(applications)
    .innerJoin(
      entertainerProfiles,
      eq(entertainerProfiles.id, applications.entertainerProfileId),
    )
    .where(
      and(
        eq(applications.opportunityId, opportunityId),
        ne(applications.state, "draft"),
      ),
    )
    .orderBy(desc(applications.createdAt));
}

export async function getApplicationForEntertainer(input: {
  opportunityId: string;
  entertainerProfileId: string;
}) {
  const db = getDb();
  return db.query.applications.findFirst({
    where: and(
      eq(applications.opportunityId, input.opportunityId),
      eq(applications.entertainerProfileId, input.entertainerProfileId),
    ),
  });
}

export async function listClarificationNotesForApplication(
  applicationId: string,
) {
  const db = getDb();
  return db
    .select({
      id: applicationClarificationNotes.id,
      body: applicationClarificationNotes.body,
      createdAt: applicationClarificationNotes.createdAt,
      authorUserId: applicationClarificationNotes.authorUserId,
    })
    .from(applicationClarificationNotes)
    .where(eq(applicationClarificationNotes.applicationId, applicationId))
    .orderBy(applicationClarificationNotes.createdAt);
}
