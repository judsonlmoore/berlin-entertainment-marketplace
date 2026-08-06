import { and, eq } from "drizzle-orm";
import {
  contactMethods,
  contactUnlocks,
  venueMemberships,
} from "@/src/db/schema/marketplace";
import { selectPreferredContact } from "@/src/domain/contact-projection";
import { assertNoHardCalendarConflict } from "@/src/db/queries/calendar-ops";
import { upsertBookingCalendarEntry } from "@/src/db/queries/calendar";

type MatchOrigin = {
  bookingId?: string;
  applicationId?: string;
  directRequestId?: string;
  profileEnquiryId?: string;
};

/**
 * Shared shortlist/accept/interest settlement: unlock preferred contacts both
 * ways. Calendar holds only when a performance window is known.
 */
export async function settleMatchAcceptance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  input: {
    entertainerProfileId: string;
    entertainerUserId: string;
    venueId: string;
    startsAt?: Date | null;
    endsAt?: Date | null;
    reason: string;
    origin: MatchOrigin;
    excludeBookingId?: string;
  },
) {
  const originRefs = {
    ...(input.origin.bookingId ? { bookingId: input.origin.bookingId } : {}),
    ...(input.origin.applicationId
      ? { applicationId: input.origin.applicationId }
      : {}),
    ...(input.origin.directRequestId
      ? { directRequestId: input.origin.directRequestId }
      : {}),
    ...(input.origin.profileEnquiryId
      ? { profileEnquiryId: input.origin.profileEnquiryId }
      : {}),
  };

  const entertainerContacts = await tx
    .select()
    .from(contactMethods)
    .where(
      and(
        eq(contactMethods.ownerType, "entertainer"),
        eq(contactMethods.ownerId, input.entertainerProfileId),
      ),
    );
  const preferredEntertainer = selectPreferredContact(
    entertainerContacts.map(
      (c: {
        id: string;
        kind: "email" | "phone" | "other";
        value: string;
        isPreferred: boolean;
      }) => ({
        id: c.id,
        kind: c.kind,
        value: c.value,
        isPreferred: c.isPreferred,
      }),
    ),
  );

  const venueOperators = await tx
    .select({ userId: venueMemberships.userId })
    .from(venueMemberships)
    .where(
      and(
        eq(venueMemberships.venueId, input.venueId),
        eq(venueMemberships.status, "active"),
      ),
    );

  if (preferredEntertainer) {
    for (const operator of venueOperators) {
      await tx.insert(contactUnlocks).values({
        ...originRefs,
        unlockedForUserId: operator.userId,
        contactMethodId: preferredEntertainer.id,
        reason: input.reason,
      });
    }
  }

  const venueContacts = await tx
    .select()
    .from(contactMethods)
    .where(
      and(
        eq(contactMethods.ownerType, "venue"),
        eq(contactMethods.ownerId, input.venueId),
      ),
    );
  const preferredVenue = selectPreferredContact(
    venueContacts.map(
      (c: {
        id: string;
        kind: "email" | "phone" | "other";
        value: string;
        isPreferred: boolean;
      }) => ({
        id: c.id,
        kind: c.kind,
        value: c.value,
        isPreferred: c.isPreferred,
      }),
    ),
  );
  if (preferredVenue) {
    await tx.insert(contactUnlocks).values({
      ...originRefs,
      unlockedForUserId: input.entertainerUserId,
      contactMethodId: preferredVenue.id,
      reason: input.reason,
    });
  }

  if (
    !input.origin.bookingId ||
    !input.startsAt ||
    !input.endsAt
  ) {
    return;
  }

  const { spaceId } = await assertNoHardCalendarConflict({
    entertainerProfileId: input.entertainerProfileId,
    venueId: input.venueId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    ...(input.excludeBookingId
      ? { excludeBookingId: input.excludeBookingId }
      : { excludeBookingId: input.origin.bookingId }),
  });

  await upsertBookingCalendarEntry(tx, {
    ownerType: "entertainer",
    ownerId: input.entertainerProfileId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    state: "requested",
    bookingId: input.origin.bookingId,
  });
  await upsertBookingCalendarEntry(tx, {
    ownerType: "venue_space",
    ownerId: spaceId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    state: "requested",
    bookingId: input.origin.bookingId,
  });
}
