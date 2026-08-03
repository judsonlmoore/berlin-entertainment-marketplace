import { and, desc, eq, inArray, lte } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  auditEvents,
  bookings,
  directRequests,
  entertainerProfiles,
  venues,
} from "@/src/db/schema/marketplace";
import { canSystemTransitionDirectRequest } from "@/src/domain/direct-request";

export async function listDirectRequestsForEntertainer(userId: string) {
  const db = getDb();
  const profile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.userId, userId),
  });
  if (!profile) return [];

  return db
    .select({
      id: directRequests.id,
      state: directRequests.state,
      startsAt: directRequests.startsAt,
      endsAt: directRequests.endsAt,
      proposedFeeCents: directRequests.proposedFeeCents,
      currency: directRequests.currency,
      formatCategory: directRequests.formatCategory,
      notes: directRequests.notes,
      responseDeadlineAt: directRequests.responseDeadlineAt,
      createdAt: directRequests.createdAt,
      venueId: venues.id,
      venueName: venues.name,
      district: venues.district,
      actName: entertainerProfiles.actName,
      entertainerProfileId: entertainerProfiles.id,
    })
    .from(directRequests)
    .innerJoin(venues, eq(venues.id, directRequests.venueId))
    .innerJoin(
      entertainerProfiles,
      eq(entertainerProfiles.id, directRequests.entertainerProfileId),
    )
    .where(eq(directRequests.entertainerProfileId, profile.id))
    .orderBy(desc(directRequests.createdAt));
}

export async function listDirectRequestsForVenues(venueIds: string[]) {
  if (venueIds.length === 0) return [];
  const db = getDb();
  return db
    .select({
      id: directRequests.id,
      state: directRequests.state,
      startsAt: directRequests.startsAt,
      endsAt: directRequests.endsAt,
      proposedFeeCents: directRequests.proposedFeeCents,
      currency: directRequests.currency,
      formatCategory: directRequests.formatCategory,
      notes: directRequests.notes,
      responseDeadlineAt: directRequests.responseDeadlineAt,
      createdAt: directRequests.createdAt,
      venueId: venues.id,
      venueName: venues.name,
      district: venues.district,
      actName: entertainerProfiles.actName,
      entertainerProfileId: entertainerProfiles.id,
    })
    .from(directRequests)
    .innerJoin(venues, eq(venues.id, directRequests.venueId))
    .innerJoin(
      entertainerProfiles,
      eq(entertainerProfiles.id, directRequests.entertainerProfileId),
    )
    .where(inArray(directRequests.venueId, venueIds))
    .orderBy(desc(directRequests.createdAt));
}

export async function getDirectRequestById(id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: directRequests.id,
      state: directRequests.state,
      startsAt: directRequests.startsAt,
      endsAt: directRequests.endsAt,
      timezone: directRequests.timezone,
      proposedFeeCents: directRequests.proposedFeeCents,
      currency: directRequests.currency,
      formatCategory: directRequests.formatCategory,
      notes: directRequests.notes,
      responseDeadlineAt: directRequests.responseDeadlineAt,
      requestedByUserId: directRequests.requestedByUserId,
      venueId: venues.id,
      venueName: venues.name,
      district: venues.district,
      entertainerProfileId: entertainerProfiles.id,
      actName: entertainerProfiles.actName,
      entertainerUserId: entertainerProfiles.userId,
    })
    .from(directRequests)
    .innerJoin(venues, eq(venues.id, directRequests.venueId))
    .innerJoin(
      entertainerProfiles,
      eq(entertainerProfiles.id, directRequests.entertainerProfileId),
    )
    .where(eq(directRequests.id, id))
    .limit(1);
  return row ?? null;
}

export async function findPendingRequest(input: {
  venueId: string;
  entertainerProfileId: string;
}) {
  const db = getDb();
  return db.query.directRequests.findFirst({
    where: and(
      eq(directRequests.venueId, input.venueId),
      eq(directRequests.entertainerProfileId, input.entertainerProfileId),
      eq(directRequests.state, "requested"),
    ),
  });
}

export async function expireOverdueDirectRequests(input?: {
  actorUserId?: string | null;
  now?: Date;
}) {
  const db = getDb();
  const now = input?.now ?? new Date();

  const overdue = await db
    .select({ id: directRequests.id, state: directRequests.state })
    .from(directRequests)
    .where(
      and(
        eq(directRequests.state, "requested"),
        lte(directRequests.responseDeadlineAt, now),
      ),
    );

  let expired = 0;
  for (const row of overdue) {
    if (
      !canSystemTransitionDirectRequest(
        row.state as "requested",
        "expired",
      )
    ) {
      continue;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(directRequests)
        .set({ state: "expired", updatedAt: now })
        .where(eq(directRequests.id, row.id));
      await tx
        .update(bookings)
        .set({ state: "expired", updatedAt: now })
        .where(
          and(
            eq(bookings.originType, "direct_request"),
            eq(bookings.originId, row.id),
          ),
        );
      await tx.insert(auditEvents).values({
        actorUserId: input?.actorUserId ?? null,
        action: "direct_request.expired",
        subjectType: "direct_request",
        subjectId: row.id,
        metadata: { from: row.state, to: "expired", reason: "response_deadline" },
      });
    });
    expired += 1;
  }

  return { expired, checkedAt: now };
}

