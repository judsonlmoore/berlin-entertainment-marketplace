import { and, eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  entertainerProfiles,
  venueMemberships,
  venueSpaces,
} from "@/src/db/schema/marketplace";
import type { CalendarOwnerType } from "@/src/domain/calendar";
import { AppError } from "@/src/domain/errors";

/** Shared ownership gate for calendar scope mutations. */
export async function assertOwnsCalendarResource(
  actorUserId: string,
  ownerType: CalendarOwnerType,
  ownerId: string,
) {
  const db = getDb();
  if (ownerType === "entertainer") {
    const profile = await db.query.entertainerProfiles.findFirst({
      where: and(
        eq(entertainerProfiles.id, ownerId),
        eq(entertainerProfiles.userId, actorUserId),
      ),
    });
    if (!profile) {
      throw new AppError("forbidden", "Not your entertainer calendar");
    }
    return;
  }

  const space = await db.query.venueSpaces.findFirst({
    where: eq(venueSpaces.id, ownerId),
  });
  if (!space) {
    throw new AppError("not_found", "Venue space not found");
  }
  const membership = await db.query.venueMemberships.findFirst({
    where: and(
      eq(venueMemberships.venueId, space.venueId),
      eq(venueMemberships.userId, actorUserId),
      eq(venueMemberships.status, "active"),
    ),
  });
  if (!membership) {
    throw new AppError("forbidden", "Not a venue operator for this space");
  }
}
