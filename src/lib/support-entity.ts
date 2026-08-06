import { and, eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  entertainerProfiles,
  venueMemberships,
  venues,
} from "@/src/db/schema/marketplace";
import type { SupportEntityType } from "@/src/lib/support-session";

export type ResolvedSupportEntity = {
  subjectUserId: string;
  label: string;
};

/**
 * Resolve the member account that owns/operates a support target entity.
 * Shared by start-support and per-request revalidation (3B).
 */
export async function resolveSupportEntity(input: {
  entityType: SupportEntityType;
  entityId: string;
}): Promise<ResolvedSupportEntity | null> {
  const db = getDb();

  if (input.entityType === "entertainer") {
    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.id, input.entityId),
      columns: { id: true, userId: true, actName: true },
    });
    if (!profile) return null;
    return { subjectUserId: profile.userId, label: profile.actName };
  }

  const venue = await db.query.venues.findFirst({
    where: eq(venues.id, input.entityId),
    columns: { id: true, name: true },
  });
  if (!venue) return null;

  const membership = await db.query.venueMemberships.findFirst({
    where: and(
      eq(venueMemberships.venueId, venue.id),
      eq(venueMemberships.status, "active"),
      eq(venueMemberships.role, "owner"),
    ),
    columns: { userId: true },
  });
  if (!membership) return null;

  return { subjectUserId: membership.userId, label: venue.name };
}

/**
 * Pure check: does the cookie's subject still own/operate the entity?
 * Used by unit tests and by revalidation after DB lookup.
 */
export function isSupportSubjectStillValid(input: {
  cookieSubjectUserId: string;
  resolved: ResolvedSupportEntity | null;
}): boolean {
  if (!input.resolved) return false;
  return input.resolved.subjectUserId === input.cookieSubjectUserId;
}
