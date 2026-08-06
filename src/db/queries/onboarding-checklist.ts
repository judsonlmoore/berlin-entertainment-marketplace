import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  applications,
  directRequests,
  entertainerProfiles,
  onboardingChecklistState,
  venues,
} from "@/src/db/schema/marketplace";
import {
  buildOnboardingChecklistView,
  type OnboardingChecklistView,
} from "@/src/domain/onboarding-checklist";
import type { ActorContext } from "@/src/domain/permissions";

export type OnboardingChecklistStepKey = "searched" | "openedResult";

async function hasPublishedProfile(actor: ActorContext): Promise<boolean> {
  if (actor.entertainerVerified || actor.venueVerified) return true;

  const db = getDb();
  if (actor.roles.includes("entertainer")) {
    const profile = await db.query.entertainerProfiles.findFirst({
      where: and(
        eq(entertainerProfiles.userId, actor.userId),
        eq(entertainerProfiles.publicationState, "approved"),
      ),
      columns: { id: true },
    });
    return Boolean(profile);
  }

  if (actor.roles.includes("venue")) {
    const venueIds = actor.venueMemberships
      .filter((m) => m.status === "active" && m.role === "owner")
      .map((m) => m.venueId);
    if (venueIds.length === 0) return false;
    const published = await db.query.venues.findFirst({
      where: and(
        inArray(venues.id, venueIds),
        eq(venues.publicationState, "approved"),
      ),
      columns: { id: true },
    });
    return Boolean(published);
  }

  return false;
}

async function hasSubmittedEnquiry(actor: ActorContext): Promise<boolean> {
  const db = getDb();

  if (actor.roles.includes("entertainer")) {
    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.userId, actor.userId),
      columns: { id: true },
    });
    if (!profile) return false;
    const [row] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.entertainerProfileId, profile.id),
          // Drafts don't count — only a real submitted enquiry.
          inArray(applications.state, [
            "submitted",
            "clarification_requested",
            "shortlisted",
            "rejected",
            "withdrawn",
          ]),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  if (actor.roles.includes("venue")) {
    const venueIds = actor.venueMemberships
      .filter((m) => m.status === "active")
      .map((m) => m.venueId);
    if (venueIds.length === 0) return false;
    const [row] = await db
      .select({ id: directRequests.id })
      .from(directRequests)
      .where(inArray(directRequests.venueId, venueIds))
      .limit(1);
    return Boolean(row);
  }

  return false;
}

/**
 * Load rail checklist for a member. Returns null when hidden (staff or
 * permanently dismissed).
 */
export async function getOnboardingChecklistView(input: {
  actor: ActorContext;
}): Promise<OnboardingChecklistView | null> {
  if (input.actor.isPlatformStaff) {
    return null;
  }

  const db = getDb();
  const state = await db.query.onboardingChecklistState.findFirst({
    where: eq(onboardingChecklistState.userId, input.actor.userId),
  });

  if (state?.dismissedAt) {
    return null;
  }

  const [published, enquiry] = await Promise.all([
    hasPublishedProfile(input.actor),
    hasSubmittedEnquiry(input.actor),
  ]);

  return buildOnboardingChecklistView({
    published,
    searched: Boolean(state?.searchedAt),
    openedResult: Boolean(state?.openedResultAt),
    enquiry,
  });
}

/** Idempotent: sets searched/opened timestamps once. */
export async function markOnboardingChecklistStep(input: {
  userId: string;
  step: OnboardingChecklistStepKey;
}): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  const db = getDb();
  const now = new Date();
  const existing = await db.query.onboardingChecklistState.findFirst({
    where: eq(onboardingChecklistState.userId, input.userId),
  });

  if (!existing) {
    await db.insert(onboardingChecklistState).values({
      userId: input.userId,
      searchedAt: input.step === "searched" ? now : null,
      openedResultAt: input.step === "openedResult" ? now : null,
      updatedAt: now,
    });
    return;
  }

  if (input.step === "searched" && existing.searchedAt) return;
  if (input.step === "openedResult" && existing.openedResultAt) return;

  await db
    .update(onboardingChecklistState)
    .set({
      ...(input.step === "searched" ? { searchedAt: now } : {}),
      ...(input.step === "openedResult" ? { openedResultAt: now } : {}),
      updatedAt: now,
    })
    .where(eq(onboardingChecklistState.userId, input.userId));
}

export async function dismissOnboardingChecklist(
  userId: string,
): Promise<void> {
  const db = getDb();
  const now = new Date();
  const existing = await db.query.onboardingChecklistState.findFirst({
    where: eq(onboardingChecklistState.userId, userId),
  });

  if (!existing) {
    await db.insert(onboardingChecklistState).values({
      userId,
      dismissedAt: now,
      updatedAt: now,
    });
    return;
  }

  if (existing.dismissedAt) return;

  await db
    .update(onboardingChecklistState)
    .set({ dismissedAt: now, updatedAt: now })
    .where(eq(onboardingChecklistState.userId, userId));
}
