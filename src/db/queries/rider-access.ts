import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  bookingTerms,
  bookings,
  entertainerProfiles,
  riderFiles,
  venues,
} from "@/src/db/schema/marketplace";
import {
  DOCUMENT_ENGAGEMENT_BOOKING_STATES,
  canViewDocumentVisibility,
  computeDocumentAccessFlags,
  filterDocumentsForViewer,
  isEngagementWindowOpen,
  resolveDocumentOwnerFromIds,
  type ProfileDocumentAccessContext,
  type ProfileDocumentVisibility,
} from "@/src/domain/profile-document";
import { can, type ActorContext } from "@/src/domain/permissions";

async function hasOpenEngagementWithProfile(input: {
  actor: ActorContext;
  entertainerProfileId: string;
  now: Date;
}): Promise<boolean> {
  const venueIds = input.actor.venueId ? [input.actor.venueId] : [];
  if (venueIds.length === 0) return false;

  const db = getDb();
  const rows = await db
    .select({
      bookingId: bookings.id,
      endsAt: bookingTerms.endsAt,
      acceptedAt: bookingTerms.acceptedAt,
    })
    .from(bookings)
    .leftJoin(bookingTerms, eq(bookingTerms.bookingId, bookings.id))
    .where(
      and(
        eq(bookings.entertainerProfileId, input.entertainerProfileId),
        inArray(bookings.venueId, venueIds),
        inArray(bookings.state, [...DOCUMENT_ENGAGEMENT_BOOKING_STATES]),
      ),
    );

  if (rows.length === 0) return false;

  // Group by booking: if any accepted terms endsAt is still open, or no accepted terms yet → open
  const byBooking = new Map<string, Date | null>();
  for (const row of rows) {
    const current = byBooking.get(row.bookingId);
    if (row.acceptedAt && row.endsAt) {
      const prev = current;
      if (!prev || row.endsAt > prev) {
        byBooking.set(row.bookingId, row.endsAt);
      }
    } else if (!byBooking.has(row.bookingId)) {
      byBooking.set(row.bookingId, null);
    }
  }

  for (const endsAt of byBooking.values()) {
    if (isEngagementWindowOpen({ now: input.now, endsAt })) {
      return true;
    }
  }
  return false;
}

export type DocumentAccessOwnerInput =
  | {
      entertainerProfileId: string;
      venueId?: never;
    }
  | {
      venueId: string;
      entertainerProfileId?: never;
    };

function assertDocumentOwner(
  input: DocumentAccessOwnerInput,
): DocumentAccessOwnerInput {
  if ("venueId" in input) {
    return { venueId: input.venueId };
  }
  return { entertainerProfileId: input.entertainerProfileId };
}

async function hasOpenEngagementWithVenue(input: {
  actor: ActorContext;
  venueId: string;
  now: Date;
}): Promise<boolean> {
  // Talent side: look up their entertainer profile, then open bookings with venue.
  const db = getDb();
  const profile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.userId, input.actor.userId),
    columns: { id: true },
  });
  if (!profile) return false;

  const rows = await db
    .select({
      bookingId: bookings.id,
      endsAt: bookingTerms.endsAt,
      acceptedAt: bookingTerms.acceptedAt,
    })
    .from(bookings)
    .leftJoin(bookingTerms, eq(bookingTerms.bookingId, bookings.id))
    .where(
      and(
        eq(bookings.venueId, input.venueId),
        eq(bookings.entertainerProfileId, profile.id),
        inArray(bookings.state, [...DOCUMENT_ENGAGEMENT_BOOKING_STATES]),
      ),
    );

  if (rows.length === 0) return false;

  const byBooking = new Map<string, Date | null>();
  for (const row of rows) {
    if (row.acceptedAt && row.endsAt) {
      const prev = byBooking.get(row.bookingId);
      if (!prev || row.endsAt > prev) {
        byBooking.set(row.bookingId, row.endsAt);
      }
    } else if (!byBooking.has(row.bookingId)) {
      byBooking.set(row.bookingId, null);
    }
  }

  for (const endsAt of byBooking.values()) {
    if (isEngagementWindowOpen({ now: input.now, endsAt })) {
      return true;
    }
  }
  return false;
}

/**
 * Access context for profile documents.
 *
 * Entertainer owners: marketplace via discover.entertainers; engagement via open booking.
 * Venue owners: marketplace via discover.venues; engagement via open booking with viewer's act.
 */
export async function getDocumentAccessContext(
  input: {
    actor: ActorContext;
    ownerUserId: string;
    publicationState: string;
    now?: Date;
  } & DocumentAccessOwnerInput,
): Promise<ProfileDocumentAccessContext> {
  const now = input.now ?? new Date();
  const isOwner = input.actor.userId === input.ownerUserId;
  const isStaff = input.actor.isPlatformStaff;
  const owner = assertDocumentOwner(input);

  if ("venueId" in owner) {
    const hasOpenEngagement =
      isOwner || isStaff
        ? true
        : await hasOpenEngagementWithVenue({
            actor: input.actor,
            venueId: owner.venueId,
            now,
          });

    return computeDocumentAccessFlags({
      isOwner,
      isStaff,
      publicationState: input.publicationState,
      canDiscoverMarketplace: can(input.actor, "discover.venues"),
      hasOpenEngagement,
    });
  }

  const hasOpenEngagement =
    isOwner || isStaff
      ? true
      : await hasOpenEngagementWithProfile({
          actor: input.actor,
          entertainerProfileId: owner.entertainerProfileId,
          now,
        });

  return computeDocumentAccessFlags({
    isOwner,
    isStaff,
    publicationState: input.publicationState,
    canDiscoverMarketplace: can(input.actor, "discover.entertainers"),
    hasOpenEngagement,
  });
}

export async function canAccessRiderFile(input: {
  actor: ActorContext;
  rider: {
    id: string;
    ownerUserId: string;
    entertainerProfileId: string | null;
    venueId?: string | null;
    bookingId?: string | null;
    visibility?: ProfileDocumentVisibility | string | null;
  };
  now?: Date;
}): Promise<boolean> {
  if (input.actor.isPlatformStaff) return true;
  if (input.rider.ownerUserId === input.actor.userId) return true;

  // Booking-scoped uploads: any party on that booking may download.
  if (input.rider.bookingId) {
    const db = getDb();
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, input.rider.bookingId),
      columns: {
        venueId: true,
        entertainerProfileId: true,
      },
    });
    if (!booking) return false;
    if (input.actor.venueId === booking.venueId) return true;
    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.id, booking.entertainerProfileId),
      columns: { userId: true },
    });
    if (profile?.userId === input.actor.userId) return true;
    return false;
  }

  const owner = resolveDocumentOwnerFromIds({
    entertainerProfileId: input.rider.entertainerProfileId,
    venueId: input.rider.venueId ?? null,
  });
  if (!owner) return false;

  const db = getDb();
  const visibility =
    (input.rider.visibility as ProfileDocumentVisibility | undefined) ??
    "engagement";

  if (owner.kind === "entertainer") {
    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.id, owner.entertainerProfileId),
    });
    if (!profile) return false;
    if (profile.userId === input.actor.userId) return true;

    const ctx = await getDocumentAccessContext({
      actor: input.actor,
      entertainerProfileId: profile.id,
      ownerUserId: profile.userId,
      publicationState: profile.publicationState,
      ...(input.now ? { now: input.now } : {}),
    });
    return canViewDocumentVisibility(visibility, ctx);
  }

  const venue = await db.query.venues.findFirst({
    where: eq(venues.id, owner.venueId),
    columns: {
      id: true,
      ownerUserId: true,
      publicationState: true,
    },
  });
  if (!venue) return false;
  if (venue.ownerUserId === input.actor.userId) return true;

  const ctx = await getDocumentAccessContext({
    actor: input.actor,
    venueId: venue.id,
    ownerUserId: venue.ownerUserId,
    publicationState: venue.publicationState,
    ...(input.now ? { now: input.now } : {}),
  });
  return canViewDocumentVisibility(visibility, ctx);
}

export async function getRiderFileForDownload(riderId: string) {
  const db = getDb();
  return db.query.riderFiles.findFirst({
    where: eq(riderFiles.id, riderId),
  });
}

const documentListColumns = {
  id: riderFiles.id,
  title: riderFiles.title,
  visibility: riderFiles.visibility,
  sortOrder: riderFiles.sortOrder,
  originalFilename: riderFiles.originalFilename,
  sizeBytes: riderFiles.sizeBytes,
  scanStatus: riderFiles.scanStatus,
  createdAt: riderFiles.createdAt,
  ownerUserId: riderFiles.ownerUserId,
  entertainerProfileId: riderFiles.entertainerProfileId,
  venueId: riderFiles.venueId,
  bookingId: riderFiles.bookingId,
} as const;

export async function listDocumentsForBooking(bookingId: string) {
  const db = getDb();
  return db
    .select(documentListColumns)
    .from(riderFiles)
    .where(eq(riderFiles.bookingId, bookingId))
    .orderBy(asc(riderFiles.sortOrder), asc(riderFiles.createdAt));
}

export async function listDocumentsForOwner(owner: DocumentAccessOwnerInput) {
  const db = getDb();
  const resolved = assertDocumentOwner(owner);
  const ownerWhere =
    "venueId" in resolved
      ? eq(riderFiles.venueId, resolved.venueId)
      : eq(riderFiles.entertainerProfileId, resolved.entertainerProfileId);

  return db
    .select(documentListColumns)
    .from(riderFiles)
    .where(and(ownerWhere, isNull(riderFiles.bookingId)))
    .orderBy(asc(riderFiles.sortOrder), asc(riderFiles.createdAt));
}

/** @deprecated Prefer listDocumentsForOwner({ entertainerProfileId }) */
export async function listDocumentsForProfile(entertainerProfileId: string) {
  return listDocumentsForOwner({ entertainerProfileId });
}

export async function listDocumentsVisibleToActor(
  input: {
    actor: ActorContext;
    ownerUserId: string;
    publicationState: string;
  } & DocumentAccessOwnerInput,
) {
  const owner = assertDocumentOwner(input);
  const docs = await listDocumentsForOwner(owner);
  const ctx = await getDocumentAccessContext({
    actor: input.actor,
    ownerUserId: input.ownerUserId,
    publicationState: input.publicationState,
    ...owner,
  });
  return filterDocumentsForViewer(docs, ctx);
}
