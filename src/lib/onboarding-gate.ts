import { eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  entertainerProfiles,
  userRoles,
  venues,
} from "@/src/db/schema/marketplace";

export type OnboardingDestination = "none" | "role" | "setup";

async function hasEntertainerProfile(userId: string): Promise<boolean> {
  const db = getDb();
  const profile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.userId, userId),
    columns: { id: true },
  });
  return Boolean(profile);
}

async function hasOwnedVenueProfile(userId: string): Promise<boolean> {
  const db = getDb();
  const venue = await db.query.venues.findFirst({
    where: eq(venues.ownerUserId, userId),
    columns: { id: true },
  });
  return Boolean(venue);
}

/**
 * Decide where a signed-in member belongs in the XOR onboarding flow.
 * Staff skip onboarding. Members need a role, then a created profile/venue
 * (draft is enough). Publication is independent and lives on `/profile`.
 * `/onboarding/setup` may still render the completion step after profile
 * creation until the user clicks Continue — do not treat `none` as “force
 * leave setup immediately” on that page.
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
    return (await hasEntertainerProfile(input.userId)) ? "none" : "setup";
  }

  return (await hasOwnedVenueProfile(input.userId)) ? "none" : "setup";
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
