import type { ActorContext, MarketplaceRole } from "@/src/domain/permissions";
import { can } from "@/src/domain/permissions";

export type RailRoleContextData = {
  mode: MarketplaceRole;
  label: string | null;
  canSwitch: boolean;
  otherMode: MarketplaceRole | null;
};

function hasVenueCapability(actor: ActorContext): boolean {
  return actor.roles.includes("venue") || Boolean(actor.venueId);
}

/** Resolve the single marketplace role for the rail badge. */
export function resolveEffectiveRoleMode(
  actor: ActorContext,
): MarketplaceRole | null {
  const hasEntertainer = actor.roles.includes("entertainer");
  const hasVenue = hasVenueCapability(actor);

  if (hasEntertainer && !hasVenue) return "entertainer";
  if (hasVenue && !hasEntertainer) return "venue";
  if (hasEntertainer) return "entertainer";
  if (hasVenue) return "venue";
  return null;
}

/**
 * Discovery nav follows the marketplace role even for platform staff who also
 * hold a talent/buyer role. Staff dual-browse stays for accounts with no
 * marketplace role; support sessions use `supportDiscoveryFlags` instead.
 */
export function discoveryNavFlags(actor: ActorContext): {
  canDiscoverEntertainers: boolean;
  canDiscoverVenues: boolean;
} {
  const mode = resolveEffectiveRoleMode(actor);
  if (mode === "entertainer") {
    return {
      canDiscoverEntertainers: false,
      canDiscoverVenues: can(actor, "discover.venues"),
    };
  }
  if (mode === "venue") {
    return {
      canDiscoverEntertainers: can(actor, "discover.entertainers"),
      canDiscoverVenues: false,
    };
  }
  return {
    canDiscoverEntertainers: can(actor, "discover.entertainers"),
    canDiscoverVenues: can(actor, "discover.venues"),
  };
}

export async function loadRailRoleContext(
  actor: ActorContext,
): Promise<RailRoleContextData | null> {
  const mode = resolveEffectiveRoleMode(actor);
  if (!mode) return null;

  let label: string | null = null;
  if (process.env.DATABASE_URL) {
    const { listCalendarResourcesForUser } =
      await import("@/src/db/queries/calendar");
    const resources = await listCalendarResourcesForUser(actor.userId);
    if (mode === "entertainer") {
      label = resources.entertainer?.name ?? null;
    } else {
      label =
        resources.spaces[0]?.venueName ??
        resources.venuesNeedingSpace[0]?.venueName ??
        null;
    }
  }

  return {
    mode,
    label,
    canSwitch: false,
    otherMode: null,
  };
}
