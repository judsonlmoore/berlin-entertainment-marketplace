import { and, eq } from "drizzle-orm";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import { getActorContext } from "@/src/db/queries/actor";
import {
  bookings,
  entertainerProfiles,
} from "@/src/db/schema/marketplace";
import { can, type ActorContext, type Permission } from "@/src/domain/permissions";

export type DiscoveryAccess =
  | { ok: true; actor: ActorContext }
  | { ok: false; reason: "signed_out" | "forbidden" };

async function requireAccess(
  permission: Permission = "marketplace.discover",
): Promise<DiscoveryAccess> {
  const session = await auth();
  if (!session?.user?.id || !process.env.DATABASE_URL) {
    return { ok: false, reason: "signed_out" };
  }

  const actor = await getActorContext(session.user.id);
  if (!actor || !can(actor, permission)) {
    return { ok: false, reason: "forbidden" };
  }

  return { ok: true, actor };
}

export async function requireDiscoveryAccess(): Promise<DiscoveryAccess> {
  return requireAccess("marketplace.discover");
}

export async function requireEntertainerDiscoveryAccess(): Promise<DiscoveryAccess> {
  return requireAccess("discover.entertainers");
}

export async function requireVenueDiscoveryAccess(): Promise<DiscoveryAccess> {
  return requireAccess("discover.venues");
}

/** True when the actor already shares a booking with this venue. */
export async function actorSharesBookingWithVenue(
  actor: ActorContext,
  venueId: string,
): Promise<boolean> {
  const db = getDb();
  const ownVenueIds = actor.venueMemberships
    .filter((m) => m.status === "active")
    .map((m) => m.venueId);

  if (ownVenueIds.includes(venueId)) {
    return true;
  }

  const [asEntertainer] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .innerJoin(
      entertainerProfiles,
      eq(entertainerProfiles.id, bookings.entertainerProfileId),
    )
    .where(
      and(
        eq(bookings.venueId, venueId),
        eq(entertainerProfiles.userId, actor.userId),
      ),
    )
    .limit(1);

  return Boolean(asEntertainer);
}

/**
 * Venue profile URLs: entertainers (and staff) may browse; venue-only users
 * may open a venue URL only when they already share a booking with that venue
 * (or are a member of it).
 */
export async function canViewVenueDiscoveryDetail(
  actor: ActorContext,
  venueId: string,
): Promise<boolean> {
  if (can(actor, "discover.venues")) {
    return true;
  }
  return actorSharesBookingWithVenue(actor, venueId);
}
