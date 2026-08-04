import { listCalendarResourcesForUser } from "@/src/db/queries/calendar";
import type {
  ActorContext,
  MarketplaceRole,
} from "@/src/domain/permissions";

export type RailRoleContextData = {
  mode: MarketplaceRole;
  label: string | null;
  canSwitch: boolean;
  otherMode: MarketplaceRole | null;
};

function hasVenueCapability(actor: ActorContext): boolean {
  return (
    actor.roles.includes("venue") ||
    actor.venueMemberships.some((membership) => membership.status === "active")
  );
}

/** Resolve which marketplace side the rail should present. */
export function resolveEffectiveRoleMode(
  actor: ActorContext,
): MarketplaceRole | null {
  const hasEntertainer = actor.roles.includes("entertainer");
  const hasVenue = hasVenueCapability(actor);

  if (actor.activeRoleMode === "entertainer" && hasEntertainer) {
    return "entertainer";
  }
  if (actor.activeRoleMode === "venue" && hasVenue) {
    return "venue";
  }
  if (hasEntertainer && !hasVenue) return "entertainer";
  if (hasVenue && !hasEntertainer) return "venue";
  if (hasEntertainer && hasVenue) {
    // Dual-role without an explicit mode: prefer act (matches calendar default).
    return "entertainer";
  }
  return null;
}

export async function loadRailRoleContext(
  actor: ActorContext,
): Promise<RailRoleContextData | null> {
  const mode = resolveEffectiveRoleMode(actor);
  if (!mode) return null;

  const hasEntertainer = actor.roles.includes("entertainer");
  const hasVenue = hasVenueCapability(actor);
  const canSwitch = hasEntertainer && hasVenue;
  const otherMode: MarketplaceRole | null = canSwitch
    ? mode === "entertainer"
      ? "venue"
      : "entertainer"
    : null;

  let label: string | null = null;
  if (process.env.DATABASE_URL) {
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

  return { mode, label, canSwitch, otherMode };
}
