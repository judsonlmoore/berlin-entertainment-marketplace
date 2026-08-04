import { and, eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  entertainerProfiles,
  userRoles,
  venueMemberships,
  venues,
} from "@/src/db/schema/marketplace";

export type OnboardingDestination = "none" | "role" | "setup";

const SUBMITTED_STATES = new Set([
  "submitted",
  "approved",
  "changes_requested",
]);

async function hasSubmittedEntertainerProfile(
  userId: string,
): Promise<boolean> {
  const db = getDb();
  const profile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.userId, userId),
    columns: { publicationState: true },
  });
  return Boolean(profile && SUBMITTED_STATES.has(profile.publicationState));
}

async function hasSubmittedVenueProfile(userId: string): Promise<boolean> {
  const db = getDb();
  const membership = await db.query.venueMemberships.findFirst({
    where: and(
      eq(venueMemberships.userId, userId),
      eq(venueMemberships.status, "active"),
      eq(venueMemberships.role, "owner"),
    ),
    columns: { venueId: true },
  });
  if (!membership) {
    return false;
  }
  const venue = await db.query.venues.findFirst({
    where: eq(venues.id, membership.venueId),
    columns: { publicationState: true },
  });
  return Boolean(venue && SUBMITTED_STATES.has(venue.publicationState));
}

/**
 * Decide where a signed-in member belongs in the XOR onboarding flow.
 * Staff skip onboarding. Members need a role, then a submitted profile.
 */
export async function resolveOnboardingDestination(input: {
  userId: string;
  isPlatformStaff: boolean;
  sessionRoles?: readonly string[];
}): Promise<OnboardingDestination> {
  if (input.isPlatformStaff) {
    return "none";
  }

  if (!process.env.DATABASE_URL) {
    return (input.sessionRoles?.length ?? 0) === 0 ? "role" : "none";
  }

  const db = getDb();
  const roleRow = await db.query.userRoles.findFirst({
    where: eq(userRoles.userId, input.userId),
    columns: { role: true },
  });

  if (!roleRow) {
    return "role";
  }

  if (roleRow.role === "entertainer") {
    return (await hasSubmittedEntertainerProfile(input.userId))
      ? "none"
      : "setup";
  }

  return (await hasSubmittedVenueProfile(input.userId)) ? "none" : "setup";
}

/** @deprecated Prefer resolveOnboardingDestination */
export async function userNeedsRoleOnboarding(input: {
  userId: string;
  isPlatformStaff: boolean;
  sessionRoles?: readonly string[];
}): Promise<boolean> {
  const destination = await resolveOnboardingDestination(input);
  return destination !== "none";
}
