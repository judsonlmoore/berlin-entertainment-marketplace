import { and, asc, count, desc, eq, gte, isNotNull, lte } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { users } from "@/src/db/schema/auth";
import {
  agreements,
  auditEvents,
  bookings,
  calendarEntries,
  contactUnlocks,
  entertainerProfiles,
  riderFiles,
  venueMemberships,
  venues,
} from "@/src/db/schema/marketplace";

export async function getAdminOperationsSnapshot() {
  const db = getDb();
  const now = new Date();

  const recentBookings = await db
    .select({
      id: bookings.id,
      state: bookings.state,
      depositStatus: bookings.depositStatus,
      originType: bookings.originType,
      updatedAt: bookings.updatedAt,
      venueName: venues.name,
      actName: entertainerProfiles.actName,
    })
    .from(bookings)
    .innerJoin(venues, eq(venues.id, bookings.venueId))
    .innerJoin(
      entertainerProfiles,
      eq(entertainerProfiles.id, bookings.entertainerProfileId),
    )
    .orderBy(desc(bookings.updatedAt))
    .limit(12);

  const recentUnlocks = await db
    .select({
      id: contactUnlocks.id,
      reason: contactUnlocks.reason,
      createdAt: contactUnlocks.createdAt,
      bookingId: contactUnlocks.bookingId,
      unlockedForUserId: contactUnlocks.unlockedForUserId,
      // Never select contact method values for staff lists.
      contactMethodId: contactUnlocks.contactMethodId,
    })
    .from(contactUnlocks)
    .orderBy(desc(contactUnlocks.createdAt))
    .limit(12);

  const expiredHolds = await db
    .select({
      id: calendarEntries.id,
      ownerType: calendarEntries.ownerType,
      ownerId: calendarEntries.ownerId,
      startsAt: calendarEntries.startsAt,
      endsAt: calendarEntries.endsAt,
      holdExpiresAt: calendarEntries.holdExpiresAt,
      state: calendarEntries.state,
    })
    .from(calendarEntries)
    .where(
      and(
        eq(calendarEntries.state, "tentative_hold"),
        isNotNull(calendarEntries.holdExpiresAt),
        lte(calendarEntries.holdExpiresAt, now),
      ),
    )
    .limit(20);

  const recentAudits = await db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      subjectType: auditEvents.subjectType,
      subjectId: auditEvents.subjectId,
      createdAt: auditEvents.createdAt,
      actorUserId: auditEvents.actorUserId,
    })
    .from(auditEvents)
    .orderBy(desc(auditEvents.createdAt))
    .limit(20);

  const memberships = await db
    .select({
      id: venueMemberships.id,
      venueId: venues.id,
      venueName: venues.name,
      role: venueMemberships.role,
      status: venueMemberships.status,
      userName: users.name,
      userEmail: users.email,
    })
    .from(venueMemberships)
    .innerJoin(venues, eq(venues.id, venueMemberships.venueId))
    .innerJoin(users, eq(users.id, venueMemberships.userId))
    .orderBy(desc(venueMemberships.createdAt))
    .limit(24);

  const riders = await db
    .select({
      id: riderFiles.id,
      mimeType: riderFiles.mimeType,
      sizeBytes: riderFiles.sizeBytes,
      scanStatus: riderFiles.scanStatus,
      blobKey: riderFiles.blobKey,
      createdAt: riderFiles.createdAt,
      ownerUserId: riderFiles.ownerUserId,
      entertainerProfileId: riderFiles.entertainerProfileId,
    })
    .from(riderFiles)
    .orderBy(desc(riderFiles.createdAt))
    .limit(12);

  const sandboxAgreements = await db
    .select({
      id: agreements.id,
      bookingId: agreements.bookingId,
      status: agreements.status,
      provider: agreements.provider,
      updatedAt: agreements.updatedAt,
    })
    .from(agreements)
    .where(eq(agreements.provider, "sandbox"))
    .orderBy(desc(agreements.updatedAt))
    .limit(12);

  const [bookingCount] = await db.select({ value: count() }).from(bookings);
  const [unlockCount] = await db
    .select({ value: count() })
    .from(contactUnlocks);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [auditWeek] = await db
    .select({ value: count() })
    .from(auditEvents)
    .where(gte(auditEvents.createdAt, weekAgo));

  return {
    metrics: {
      bookings: bookingCount?.value ?? 0,
      unlocks: unlockCount?.value ?? 0,
      auditsLast7Days: auditWeek?.value ?? 0,
      expiredHolds: expiredHolds.length,
    },
    recentBookings,
    recentUnlocks,
    expiredHolds,
    recentAudits,
    memberships,
    riders,
    sandboxAgreements,
  };
}

export async function listRiderFilesForProfile(entertainerProfileId: string) {
  const db = getDb();
  return db
    .select({
      id: riderFiles.id,
      title: riderFiles.title,
      visibility: riderFiles.visibility,
      sortOrder: riderFiles.sortOrder,
      mimeType: riderFiles.mimeType,
      sizeBytes: riderFiles.sizeBytes,
      scanStatus: riderFiles.scanStatus,
      createdAt: riderFiles.createdAt,
      blobKey: riderFiles.blobKey,
      originalFilename: riderFiles.originalFilename,
    })
    .from(riderFiles)
    .where(eq(riderFiles.entertainerProfileId, entertainerProfileId))
    .orderBy(asc(riderFiles.sortOrder), desc(riderFiles.createdAt));
}
