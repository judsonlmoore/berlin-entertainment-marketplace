import type { ActorContext, MarketplaceRole } from "@/src/domain/permissions";

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
