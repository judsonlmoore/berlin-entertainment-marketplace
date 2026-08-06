import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  bookingTerms,
  bookings,
  entertainerProfiles,
  riderFiles,
} from "@/src/db/schema/marketplace";
import {
  DOCUMENT_ENGAGEMENT_BOOKING_STATES,
  canViewDocumentVisibility,
  filterDocumentsForViewer,
  isEngagementWindowOpen,
  type ProfileDocumentAccessContext,
  type ProfileDocumentVisibility,
} from "@/src/domain/profile-document";
import { can, type ActorContext } from "@/src/domain/permissions";

async function hasOpenEngagementWithProfile(input: {
  actor: ActorContext;
  entertainerProfileId: string;
  now: Date;
}): Promise<boolean> {
  const venueIds = input.actor.venueMemberships
    .filter((m) => m.status === "active")
    .map((m) => m.venueId);
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

export async function getDocumentAccessContext(input: {
  actor: ActorContext;
  entertainerProfileId: string;
  ownerUserId: string;
  publicationState: string;
  now?: Date;
}): Promise<ProfileDocumentAccessContext> {
  const now = input.now ?? new Date();
  const isOwner = input.actor.userId === input.ownerUserId;
  const isStaff = input.actor.isPlatformStaff;

  const canSeeMarketplace =
    isOwner ||
    isStaff ||
    (can(input.actor, "discover.entertainers") &&
      input.publicationState === "approved");

  const canSeeEngagement =
    isOwner ||
    isStaff ||
    (await hasOpenEngagementWithProfile({
      actor: input.actor,
      entertainerProfileId: input.entertainerProfileId,
      now,
    }));

  return {
    isOwner,
    isStaff,
    canSeeMarketplace,
    canSeeEngagement,
  };
}

export async function canAccessRiderFile(input: {
  actor: ActorContext;
  rider: {
    id: string;
    ownerUserId: string;
    entertainerProfileId: string | null;
    visibility?: ProfileDocumentVisibility | string | null;
  };
  now?: Date;
}): Promise<boolean> {
  if (input.actor.isPlatformStaff) return true;
  if (input.rider.ownerUserId === input.actor.userId) return true;
  if (!input.rider.entertainerProfileId) return false;

  const db = getDb();
  const profile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.id, input.rider.entertainerProfileId),
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

  const visibility =
    (input.rider.visibility as ProfileDocumentVisibility | undefined) ??
    "engagement";
  return canViewDocumentVisibility(visibility, ctx);
}

export async function getRiderFileForDownload(riderId: string) {
  const db = getDb();
  return db.query.riderFiles.findFirst({
    where: eq(riderFiles.id, riderId),
  });
}

export async function listDocumentsForProfile(entertainerProfileId: string) {
  const db = getDb();
  return db
    .select({
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
    })
    .from(riderFiles)
    .where(eq(riderFiles.entertainerProfileId, entertainerProfileId))
    .orderBy(asc(riderFiles.sortOrder), asc(riderFiles.createdAt));
}

export async function listDocumentsVisibleToActor(input: {
  actor: ActorContext;
  entertainerProfileId: string;
  ownerUserId: string;
  publicationState: string;
}) {
  const docs = await listDocumentsForProfile(input.entertainerProfileId);
  const ctx = await getDocumentAccessContext(input);
  return filterDocumentsForViewer(docs, ctx);
}
