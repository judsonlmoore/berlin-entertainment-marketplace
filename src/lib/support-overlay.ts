import type { ActorContext, MarketplaceRole } from "@/src/domain/permissions";
import type { SupportSessionPayload } from "@/src/lib/support-session";

/**
 * Overlay staff with the supported business for marketplace chrome + content.
 * Auth identity stays staff (avatar / audits). Effective actor uses the
 * subject's userId and roles so calendars, discovery, and gates match them.
 * isPlatformStaff is false so staff dual-browse privileges do not leak.
 */
export function applySupportOverlay(
  _staffActor: ActorContext,
  support: SupportSessionPayload,
  subjectActor: ActorContext,
): ActorContext {
  if (support.entityType === "entertainer") {
    return {
      userId: subjectActor.userId,
      isPlatformStaff: false,
      accountStatus: subjectActor.accountStatus ?? "active",
      roles: ["entertainer"] satisfies MarketplaceRole[],
      entertainerVerified: subjectActor.entertainerVerified,
      venueVerified: false,
      venueMemberships: [],
    };
  }

  return {
    userId: subjectActor.userId,
    isPlatformStaff: false,
    accountStatus: subjectActor.accountStatus ?? "active",
    roles: ["venue"] satisfies MarketplaceRole[],
    entertainerVerified: false,
    venueVerified: subjectActor.venueMemberships.some(
      (m) => m.venueId === support.entityId,
    )
      ? subjectActor.venueVerified
      : false,
    venueMemberships: subjectActor.venueMemberships.filter(
      (m) => m.venueId === support.entityId && m.status === "active",
    ),
  };
}

/**
 * When supporting an entity, discovery nav follows that role — not staff's
 * dual-browse privilege — so the session feels like the business.
 */
export function supportDiscoveryFlags(support: SupportSessionPayload | null): {
  canDiscoverEntertainers: boolean;
  canDiscoverVenues: boolean;
} | null {
  if (!support) return null;
  if (support.entityType === "venue") {
    return { canDiscoverEntertainers: true, canDiscoverVenues: false };
  }
  return { canDiscoverEntertainers: false, canDiscoverVenues: true };
}
