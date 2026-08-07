import { and, eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { bookings, entertainerProfiles } from "@/src/db/schema/marketplace";
import type { BookingParty } from "@/src/domain/booking";
import { AppError } from "@/src/domain/errors";
import { can, type ActorContext } from "@/src/domain/permissions";

export type BookingRow = typeof bookings.$inferSelect;

export async function loadBookingAccess(
  actor: ActorContext,
  bookingId: string,
) {
  const db = getDb();
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
  });
  if (!booking) {
    throw new AppError("not_found", "Booking not found");
  }

  const profile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.id, booking.entertainerProfileId),
  });
  if (!profile) {
    throw new AppError("not_found", "Entertainer profile missing");
  }

  const isEntertainer = profile.userId === actor.userId;
  const isVenue = actor.venueId === booking.venueId;

  // Prefer booking-party role over staff so staff who are also a party
  // can drive Accept / Counter / terms transitions.
  let party: BookingParty | null = null;
  if (isEntertainer) party = "entertainer";
  else if (isVenue) party = "venue";
  else if (actor.isPlatformStaff) party = "staff";

  if (!party || !can(actor, "booking.view")) {
    throw new AppError("forbidden", "Not a party to this booking");
  }

  return { booking, profile, party, isEntertainer, isVenue };
}

export async function bumpBookingVersion(
  // Transaction client from drizzle neon-serverless.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  booking: BookingRow,
  expectedVersion: number,
  patch: Partial<typeof bookings.$inferInsert>,
) {
  if (booking.version !== expectedVersion) {
    throw new AppError(
      "stale_version",
      "Booking changed; refresh and try again",
      { expectedVersion, actualVersion: booking.version },
    );
  }

  const [updated] = await tx
    .update(bookings)
    .set({
      ...patch,
      version: expectedVersion + 1,
      updatedAt: new Date(),
    })
    .where(
      and(eq(bookings.id, booking.id), eq(bookings.version, expectedVersion)),
    )
    .returning();

  if (!updated) {
    throw new AppError(
      "stale_version",
      "Booking changed; refresh and try again",
    );
  }
  return updated as BookingRow;
}
