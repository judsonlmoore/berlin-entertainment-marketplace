"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import { getActorContext } from "@/src/db/queries/actor";
import {
  clearBookingCalendarEntries,
  upsertBookingCalendarEntry,
} from "@/src/db/queries/calendar";
import { assertNoHardCalendarConflict } from "@/src/db/queries/calendar-ops";
import {
  auditEvents,
  bookingTerms,
  bookings,
  depositStatusEvents,
  entertainerProfiles,
} from "@/src/db/schema/marketplace";
import {
  canActorTransitionBooking,
  canCancelBooking,
  canRecordDepositStatus,
  isTermsEligibleState,
  nextTermsVersion,
  type BookingParty,
  type BookingState,
  type DepositStatus,
} from "@/src/domain/booking";
import { AppError } from "@/src/domain/errors";
import { can, type ActorContext } from "@/src/domain/permissions";

export type ActionResult =
  { ok: true; id?: string } | { ok: false; code: string; message: string };

function toActionError(error: unknown): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, code: error.code, message: error.message };
  }
  throw error;
}

async function requireActor() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AppError("unauthorized", "Sign in required");
  }
  const actor = await getActorContext(session.user.id);
  if (!actor) {
    throw new AppError("unauthorized", "Sign in required");
  }
  return { session, actor };
}

type BookingRow = typeof bookings.$inferSelect;

async function loadBookingAccess(actor: ActorContext, bookingId: string) {
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
  const isVenue = actor.venueMemberships.some(
    (m) =>
      m.venueId === booking.venueId &&
      m.status === "active" &&
      (m.role === "owner" || m.role === "member"),
  );

  let party: BookingParty | null = null;
  if (actor.isPlatformStaff) party = "staff";
  else if (isEntertainer) party = "entertainer";
  else if (isVenue) party = "venue";

  if (!party || !can(actor, "booking.view")) {
    throw new AppError("forbidden", "Not a party to this booking");
  }
  if (!actor.isPlatformStaff && !isEntertainer && !isVenue) {
    throw new AppError("forbidden", "Not a party to this booking");
  }

  return { booking, profile, party, isEntertainer, isVenue };
}

async function bumpBookingVersion(
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
  return updated;
}

const proposeSchema = z.object({
  bookingId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  feeEur: z.coerce.number().min(0),
  performanceFormat: z.string().trim().min(1).max(120),
  cancellationTerms: z.string().trim().min(1).max(4000),
  productionObligations: z.string().trim().min(1).max(4000),
  depositTerms: z.string().trim().max(4000).optional(),
  locale: z.enum(["en", "de"]).default("en"),
});

export async function proposeBookingTerms(
  input: z.infer<typeof proposeSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor } = await requireActor();
    const parsed = proposeSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid terms proposal");
    }
    if (!can(actor, "booking.propose_terms")) {
      throw new AppError("forbidden", "Cannot propose terms");
    }

    const { booking, party } = await loadBookingAccess(
      actor,
      parsed.data.bookingId,
    );
    if (party !== "venue" && party !== "entertainer") {
      throw new AppError("forbidden", "Only booking parties can propose terms");
    }
    if (!isTermsEligibleState(booking.state as BookingState)) {
      throw new AppError(
        "invalid_transition",
        `Cannot propose terms while booking is ${booking.state}`,
      );
    }

    const startsAt = new Date(parsed.data.startsAt);
    const endsAt = new Date(parsed.data.endsAt);
    if (endsAt <= startsAt) {
      throw new AppError("validation", "End must be after start");
    }

    const db = getDb();
    let termsId: string | undefined;
    await db.transaction(async (tx) => {
      await bumpBookingVersion(tx, booking, parsed.data.expectedVersion, {});

      const [latest] = await tx
        .select({ version: bookingTerms.version })
        .from(bookingTerms)
        .where(eq(bookingTerms.bookingId, booking.id))
        .orderBy(desc(bookingTerms.version))
        .limit(1);

      const version = nextTermsVersion(latest?.version ?? null);
      const [created] = await tx
        .insert(bookingTerms)
        .values({
          bookingId: booking.id,
          version,
          proposedByUserId: session.user.id,
          startsAt,
          endsAt,
          feeCents: Math.round(parsed.data.feeEur * 100),
          performanceFormat: parsed.data.performanceFormat,
          cancellationTerms: parsed.data.cancellationTerms,
          productionObligations: parsed.data.productionObligations,
          depositTerms: parsed.data.depositTerms ?? null,
          snapshot: {
            venueId: booking.venueId,
            entertainerProfileId: booking.entertainerProfileId,
            originType: booking.originType,
            originId: booking.originId,
            proposedByUserId: session.user.id,
            proposedAt: new Date().toISOString(),
          },
        })
        .returning();
      if (!created) {
        throw new AppError("validation", "Failed to create terms");
      }
      termsId = created.id;

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "booking.terms_proposed",
        subjectType: "booking",
        subjectId: booking.id,
        metadata: { termsId: created.id, termsVersion: version },
      });
    });

    revalidatePath(`/${parsed.data.locale}/marketplace/bookings`);
    revalidatePath(
      `/${parsed.data.locale}/marketplace/bookings/${parsed.data.bookingId}`,
    );
    return { ok: true, ...(termsId ? { id: termsId } : {}) };
  } catch (error) {
    return toActionError(error);
  }
}

const acceptSchema = z.object({
  bookingId: z.string().uuid(),
  termsId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  locale: z.enum(["en", "de"]).default("en"),
});

export async function acceptBookingTerms(
  input: z.infer<typeof acceptSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor } = await requireActor();
    const parsed = acceptSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid terms acceptance");
    }
    if (!can(actor, "booking.accept_terms")) {
      throw new AppError("forbidden", "Cannot accept terms");
    }

    const { booking, party } = await loadBookingAccess(
      actor,
      parsed.data.bookingId,
    );
    if (party !== "venue" && party !== "entertainer") {
      throw new AppError("forbidden", "Only booking parties can accept terms");
    }
    if (
      !canActorTransitionBooking(
        booking.state as BookingState,
        "terms_agreed",
        party,
      )
    ) {
      throw new AppError(
        "invalid_transition",
        `Cannot move booking from ${booking.state} to terms_agreed`,
      );
    }

    const db = getDb();
    await db.transaction(async (tx) => {
      const terms = await tx.query.bookingTerms.findFirst({
        where: and(
          eq(bookingTerms.id, parsed.data.termsId),
          eq(bookingTerms.bookingId, booking.id),
        ),
      });
      if (!terms) {
        throw new AppError("not_found", "Terms not found");
      }
      if (terms.acceptedAt) {
        throw new AppError("conflict", "Terms already accepted");
      }
      if (terms.proposedByUserId === session.user.id) {
        throw new AppError(
          "validation",
          "The other party must accept the proposed terms",
        );
      }

      await tx
        .update(bookingTerms)
        .set({
          acceptedAt: new Date(),
          acceptedByUserId: session.user.id,
        })
        .where(eq(bookingTerms.id, terms.id));

      await bumpBookingVersion(tx, booking, parsed.data.expectedVersion, {
        state: "terms_agreed",
      });

      const { spaceId } = await assertNoHardCalendarConflict({
        entertainerProfileId: booking.entertainerProfileId,
        venueId: booking.venueId,
        startsAt: terms.startsAt,
        endsAt: terms.endsAt,
        excludeBookingId: booking.id,
      });

      await upsertBookingCalendarEntry(tx, {
        ownerType: "entertainer",
        ownerId: booking.entertainerProfileId,
        startsAt: terms.startsAt,
        endsAt: terms.endsAt,
        state: "requested",
        bookingId: booking.id,
      });
      await upsertBookingCalendarEntry(tx, {
        ownerType: "venue_space",
        ownerId: spaceId,
        startsAt: terms.startsAt,
        endsAt: terms.endsAt,
        state: "requested",
        bookingId: booking.id,
      });

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "booking.terms_agreed",
        subjectType: "booking",
        subjectId: booking.id,
        metadata: {
          termsId: terms.id,
          termsVersion: terms.version,
          from: booking.state,
        },
      });
    });

    revalidatePath(`/${parsed.data.locale}/marketplace/bookings`);
    revalidatePath(
      `/${parsed.data.locale}/marketplace/bookings/${parsed.data.bookingId}`,
    );
    revalidatePath(`/${parsed.data.locale}/marketplace/calendar`);
    return { ok: true, id: parsed.data.bookingId };
  } catch (error) {
    return toActionError(error);
  }
}

const cancelSchema = z.object({
  bookingId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  reason: z.string().trim().min(1).max(2000),
  locale: z.enum(["en", "de"]).default("en"),
});

export async function cancelBooking(
  input: z.infer<typeof cancelSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor } = await requireActor();
    const parsed = cancelSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid cancellation");
    }
    if (!can(actor, "booking.cancel")) {
      throw new AppError("forbidden", "Cannot cancel booking");
    }

    const { booking, party } = await loadBookingAccess(
      actor,
      parsed.data.bookingId,
    );
    if (!canCancelBooking(booking.state as BookingState, party)) {
      throw new AppError(
        "invalid_transition",
        `Cannot cancel booking in state ${booking.state}`,
      );
    }

    const db = getDb();
    await db.transaction(async (tx) => {
      await bumpBookingVersion(tx, booking, parsed.data.expectedVersion, {
        state: "cancelled",
        cancelledAt: new Date(),
        cancelledReason: parsed.data.reason,
      });

      await clearBookingCalendarEntries(tx, booking.id);

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "booking.cancelled",
        subjectType: "booking",
        subjectId: booking.id,
        metadata: {
          from: booking.state,
          reason: parsed.data.reason,
        },
      });
    });

    revalidatePath(`/${parsed.data.locale}/marketplace/bookings`);
    revalidatePath(
      `/${parsed.data.locale}/marketplace/bookings/${parsed.data.bookingId}`,
    );
    revalidatePath(`/${parsed.data.locale}/marketplace/calendar`);
    return { ok: true, id: parsed.data.bookingId };
  } catch (error) {
    return toActionError(error);
  }
}

const depositSchema = z.object({
  bookingId: z.string().uuid(),
  status: z.enum([
    "not_required",
    "pending",
    "received",
    "refunded",
    "disputed",
  ]),
  note: z.string().trim().max(2000).optional(),
  locale: z.enum(["en", "de"]).default("en"),
});

export async function recordDepositStatus(
  input: z.infer<typeof depositSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor } = await requireActor();
    const parsed = depositSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid deposit status");
    }

    const { booking } = await loadBookingAccess(actor, parsed.data.bookingId);
    if (
      !can(actor, "booking.record_deposit", { venueId: booking.venueId }) &&
      !actor.isPlatformStaff
    ) {
      throw new AppError("forbidden", "Venue operator or staff required");
    }
    if (
      !canRecordDepositStatus(
        booking.state as BookingState,
        parsed.data.status as DepositStatus,
      )
    ) {
      throw new AppError("validation", "Invalid deposit status for booking");
    }

    const db = getDb();
    await db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({
          depositStatus: parsed.data.status,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, booking.id));

      await tx.insert(depositStatusEvents).values({
        bookingId: booking.id,
        status: parsed.data.status,
        note: parsed.data.note ?? null,
        recordedByUserId: session.user.id,
      });

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "booking.deposit_status",
        subjectType: "booking",
        subjectId: booking.id,
        metadata: {
          from: booking.depositStatus,
          to: parsed.data.status,
          // Deposit never confirms a booking.
          bookingStateUnchanged: booking.state,
        },
      });
    });

    revalidatePath(`/${parsed.data.locale}/marketplace/bookings`);
    revalidatePath(
      `/${parsed.data.locale}/marketplace/bookings/${parsed.data.bookingId}`,
    );
    return { ok: true, id: parsed.data.bookingId };
  } catch (error) {
    return toActionError(error);
  }
}
