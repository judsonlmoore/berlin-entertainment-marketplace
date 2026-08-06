import { and, eq, inArray, or } from "drizzle-orm";
import { getDb, type Database } from "@/src/db/client";
import {
  accounts,
  authenticators,
  users,
  sessions,
} from "@/src/db/schema/auth";
import {
  contactMethods,
  auditEvents,
  bookings,
  entertainerProfiles,
  venues,
} from "@/src/db/schema/marketplace";
import {
  anonymizePii,
  anonymizeContactValue,
  validateAnonymizationPreconditions,
  prepareAnonymizationAudit,
  type AnonymizationReason,
} from "@/src/domain/anonymization";

type DbExecutor = Pick<Database, "select">;

const ACTIVE_BOOKING_STATES = [
  "requested",
  "applied",
  "shortlisted",
  "accepted",
  "terms_agreed",
  "agreement_generated",
  "partially_signed",
  "confirmed",
] as const;

async function listEntertainerProfileIds(
  db: DbExecutor,
  userId: string,
): Promise<string[]> {
  const rows = await db
    .select({ id: entertainerProfiles.id })
    .from(entertainerProfiles)
    .where(eq(entertainerProfiles.userId, userId));
  return rows.map((row) => row.id);
}

async function listActiveVenueIds(
  db: DbExecutor,
  userId: string,
): Promise<string[]> {
  const rows = await db
    .select({ venueId: venues.id })
    .from(venues)
    .where(eq(venues.ownerUserId, userId));
  return rows.map((row) => row.venueId);
}

async function listOwnedVenueIds(
  db: DbExecutor,
  userId: string,
): Promise<string[]> {
  return listActiveVenueIds(db, userId);
}

/**
 * Check if a user has active bookings that would prevent anonymization.
 */
export async function checkActiveBookings(userId: string): Promise<boolean> {
  const db = getDb();
  const [profileIds, venueIds] = await Promise.all([
    listEntertainerProfileIds(db, userId),
    listActiveVenueIds(db, userId),
  ]);

  const partyFilters = [];
  if (profileIds.length > 0) {
    partyFilters.push(inArray(bookings.entertainerProfileId, profileIds));
  }
  if (venueIds.length > 0) {
    partyFilters.push(inArray(bookings.venueId, venueIds));
  }
  if (partyFilters.length === 0) {
    return false;
  }

  const userBookings = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        or(...partyFilters),
        inArray(bookings.state, [...ACTIVE_BOOKING_STATES]),
      ),
    )
    .limit(1);

  return userBookings.length > 0;
}

/**
 * Check if a user has unresolved deposit disputes.
 */
export async function checkUnresolvedDisputes(
  userId: string,
): Promise<boolean> {
  const db = getDb();
  const [profileIds, venueIds] = await Promise.all([
    listEntertainerProfileIds(db, userId),
    listActiveVenueIds(db, userId),
  ]);

  const partyFilters = [];
  if (profileIds.length > 0) {
    partyFilters.push(inArray(bookings.entertainerProfileId, profileIds));
  }
  if (venueIds.length > 0) {
    partyFilters.push(inArray(bookings.venueId, venueIds));
  }
  if (partyFilters.length === 0) {
    return false;
  }

  const disputedBookings = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(or(...partyFilters), eq(bookings.depositStatus, "disputed")))
    .limit(1);

  return disputedBookings.length > 0;
}

/**
 * Get all contact methods owned by the user.
 * Includes user contacts, entertainer contacts, and venue contacts where user is owner.
 *
 * contact_methods.owner_id is text while profile/venue ids are uuid — resolve ids
 * first and compare with inArray instead of a cross-type SQL subquery.
 */
async function getUserContactMethods(db: DbExecutor, userId: string) {
  const userContacts = await db
    .select()
    .from(contactMethods)
    .where(
      and(
        eq(contactMethods.ownerType, "user"),
        eq(contactMethods.ownerId, userId),
      ),
    );

  const [profileIds, ownedVenueIds] = await Promise.all([
    listEntertainerProfileIds(db, userId),
    listOwnedVenueIds(db, userId),
  ]);

  const entertainerContacts =
    profileIds.length === 0
      ? []
      : await db
          .select()
          .from(contactMethods)
          .where(
            and(
              eq(contactMethods.ownerType, "entertainer"),
              inArray(contactMethods.ownerId, profileIds),
            ),
          );

  const venueContacts =
    ownedVenueIds.length === 0
      ? []
      : await db
          .select()
          .from(contactMethods)
          .where(
            and(
              eq(contactMethods.ownerType, "venue"),
              inArray(contactMethods.ownerId, ownedVenueIds),
            ),
          );

  return [...userContacts, ...entertainerContacts, ...venueContacts];
}

/**
 * Permanently anonymize a user account and all associated PII.
 * This operation is irreversible and happens within a database transaction.
 *
 * @throws {Error} If preconditions are not met or anonymization fails
 */
export async function anonymizeUserAccount(
  userId: string,
  reason: AnonymizationReason,
  actorUserId: string,
): Promise<void> {
  const db = getDb();

  const hasActiveBookings = await checkActiveBookings(userId);
  const hasUnresolvedDisputes = await checkUnresolvedDisputes(userId);

  await db.transaction(async (tx) => {
    const user = await tx.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.anonymizedAt) {
      throw new Error("Account is already anonymized");
    }

    validateAnonymizationPreconditions({
      userId,
      isAlreadyAnonymized: Boolean(user.anonymizedAt),
      hasActiveBookings,
      hasUnresolvedDisputes,
    });

    const now = new Date();
    const anonymizedPii = anonymizePii(userId);

    await tx
      .update(users)
      .set({
        name: anonymizedPii.name,
        email: anonymizedPii.email,
        emailVerified: null,
        image: anonymizedPii.image,
        anonymizedAt: now,
        anonymizedReason: reason,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    const userContactsList = await getUserContactMethods(tx, userId);
    for (const contact of userContactsList) {
      const anonymizedValue = anonymizeContactValue(contact.id, contact.kind);
      await tx
        .update(contactMethods)
        .set({
          value: anonymizedValue,
          updatedAt: now,
        })
        .where(eq(contactMethods.id, contact.id));
    }

    // Sever identity links so the same OAuth/email provider can create a fresh user.
    await tx.delete(accounts).where(eq(accounts.userId, userId));
    await tx.delete(authenticators).where(eq(authenticators.userId, userId));
    await tx.delete(sessions).where(eq(sessions.userId, userId));

    const auditData = prepareAnonymizationAudit({
      userId,
      reason,
      timestamp: now,
      actorUserId,
    });

    await tx.insert(auditEvents).values({
      actorUserId: actorUserId,
      action: auditData.action,
      subjectType: auditData.subjectType,
      subjectId: auditData.subjectId,
      metadata: auditData.metadata,
    });
  });
}
