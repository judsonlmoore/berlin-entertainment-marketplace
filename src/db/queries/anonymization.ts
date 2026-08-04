import { and, eq, or, sql } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { users, sessions } from "@/src/db/schema/auth";
import {
  contactMethods,
  auditEvents,
  bookings,
} from "@/src/db/schema/marketplace";
import {
  anonymizePii,
  anonymizeContactValue,
  validateAnonymizationPreconditions,
  prepareAnonymizationAudit,
  type AnonymizationReason,
} from "@/src/domain/anonymization";

/**
 * Check if a user has active bookings that would prevent anonymization.
 */
export async function checkActiveBookings(userId: string): Promise<boolean> {
  const db = getDb();

  const activeBookingStates = [
    "requested",
    "applied",
    "shortlisted",
    "accepted",
    "terms_agreed",
    "agreement_generated",
    "partially_signed",
    "confirmed",
  ] as const;

  const userBookings = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        or(
          sql`${bookings.venueId} IN (
            SELECT venue_id FROM venue_memberships 
            WHERE user_id = ${userId} AND status = 'active'
          )`,
          sql`${bookings.entertainerProfileId} IN (
            SELECT id FROM entertainer_profiles 
            WHERE user_id = ${userId}
          )`,
        ),
        sql`${bookings.state} IN (${sql.join(
          activeBookingStates.map((state) => sql`${state}`),
          sql`, `,
        )})`,
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

  const disputedBookings = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        or(
          sql`${bookings.venueId} IN (
            SELECT venue_id FROM venue_memberships 
            WHERE user_id = ${userId} AND status = 'active'
          )`,
          sql`${bookings.entertainerProfileId} IN (
            SELECT id FROM entertainer_profiles 
            WHERE user_id = ${userId}
          )`,
        ),
        eq(bookings.depositStatus, "disputed"),
      ),
    )
    .limit(1);

  return disputedBookings.length > 0;
}

/**
 * Get all contact methods owned by the user.
 * Includes user contacts, entertainer contacts, and venue contacts where user is owner.
 */
async function getUserContactMethods(userId: string) {
  const db = getDb();

  const userContacts = await db
    .select()
    .from(contactMethods)
    .where(
      and(
        eq(contactMethods.ownerType, "user"),
        eq(contactMethods.ownerId, userId),
      ),
    );

  const entertainerContacts = await db
    .select()
    .from(contactMethods)
    .where(
      sql`${contactMethods.ownerType} = 'entertainer' AND ${contactMethods.ownerId} IN (
        SELECT id FROM entertainer_profiles WHERE user_id = ${userId}
      )`,
    );

  return [...userContacts, ...entertainerContacts];
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

    const hasActiveBookings = await checkActiveBookings(userId);
    const hasUnresolvedDisputes = await checkUnresolvedDisputes(userId);

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

    const userContactsList = await getUserContactMethods(userId);
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
