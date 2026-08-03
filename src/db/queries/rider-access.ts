import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  bookings,
  entertainerProfiles,
  riderFiles,
} from "@/src/db/schema/marketplace";
import type { ActorContext } from "@/src/domain/permissions";

const RIDER_UNLOCK_BOOKING_STATES = [
  "shortlisted",
  "accepted",
  "terms_agreed",
  "agreement_generated",
  "partially_signed",
  "confirmed",
] as const;

export async function canAccessRiderFile(input: {
  actor: ActorContext;
  rider: {
    id: string;
    ownerUserId: string;
    entertainerProfileId: string | null;
  };
}): Promise<boolean> {
  if (input.actor.isPlatformStaff) {
    return true;
  }
  if (input.rider.ownerUserId === input.actor.userId) {
    return true;
  }
  if (!input.rider.entertainerProfileId) {
    return false;
  }

  const db = getDb();
  const profile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.id, input.rider.entertainerProfileId),
  });
  if (profile?.userId === input.actor.userId) {
    return true;
  }

  const venueIds = input.actor.venueMemberships
    .filter((m) => m.status === "active")
    .map((m) => m.venueId);
  if (venueIds.length === 0) {
    return false;
  }

  const [row] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.entertainerProfileId, input.rider.entertainerProfileId),
        inArray(bookings.venueId, venueIds),
        inArray(bookings.state, [...RIDER_UNLOCK_BOOKING_STATES]),
      ),
    )
    .limit(1);

  return Boolean(row);
}

export async function getRiderFileForDownload(riderId: string) {
  const db = getDb();
  return db.query.riderFiles.findFirst({
    where: eq(riderFiles.id, riderId),
  });
}
