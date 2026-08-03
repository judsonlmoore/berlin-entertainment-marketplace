"use server";

import {
  type ActionResult,
  requireActor,
  toActionError,
} from "@/src/actions/_shared";
import {
  bumpBookingVersion,
  loadBookingAccess,
} from "@/src/actions/_booking-access";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/src/db/client";
import { users } from "@/src/db/schema/auth";
import {
  getAgreementForBooking,
  getLatestSandboxTemplates,
  getVenueOwnerUserId,
} from "@/src/db/queries/agreements";
import {
  ensureDefaultVenueSpace,
  findOverlappingBlockingEntries,
  getPrimaryVenueSpaceId,
  upsertBookingCalendarEntry,
} from "@/src/db/queries/calendar";
import {
  agreementTemplates,
  agreements,
  auditEvents,
  bookingTerms,
  signatures,
  venues,
} from "@/src/db/schema/marketplace";
import {
  canGenerateAgreement,
  renderAgreementDocuments,
  signatureProgress,
} from "@/src/domain/agreement";
import {
  canActorTransitionBooking,
  type BookingState,
} from "@/src/domain/booking";
import { AppError } from "@/src/domain/errors";
import { can } from "@/src/domain/permissions";
import { getESignProviderForGeneration } from "@/src/integrations/esign";

async function ensureTemplates() {
  let { german, english } = await getLatestSandboxTemplates();
  if (german && english) return { german, english };

  const db = getDb();
  if (!german) {
    const [created] = await db
      .insert(agreementTemplates)
      .values({
        locale: "de",
        version: "de-sandbox-1",
        legalReviewStatus: "sandbox",
        body: [
          "SANDBOX — kein rechtsverbindliches Dokument.",
          "Vereinbarung v{{termsVersion}} zwischen {{venueName}} und {{actName}}.",
          "Leistung: {{startsAt}}–{{endsAt}} ({{timezone}}).",
          "Honorar: {{fee}}. Format: {{performanceFormat}}.",
          "Storno: {{cancellationTerms}}.",
          "Produktion: {{productionObligations}}.",
          "Kaution: {{depositTerms}}.",
          "Deutscher Text ist maßgeblich.",
        ].join("\n"),
      })
      .returning();
    german = created!;
  }
  if (!english) {
    const [created] = await db
      .insert(agreementTemplates)
      .values({
        locale: "en",
        version: "en-sandbox-1",
        legalReviewStatus: "sandbox",
        body: [
          "SANDBOX — not a legally binding document.",
          "Agreement v{{termsVersion}} between {{venueName}} and {{actName}}.",
          "Performance: {{startsAt}}–{{endsAt}} ({{timezone}}).",
          "Fee: {{fee}}. Format: {{performanceFormat}}.",
          "Cancellation: {{cancellationTerms}}.",
          "Production: {{productionObligations}}.",
          "Deposit: {{depositTerms}}.",
          "German text is controlling; English is a convenience translation.",
        ].join("\n"),
      })
      .returning();
    english = created!;
  }
  return { german, english };
}

const generateSchema = z.object({
  bookingId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  locale: z.enum(["en", "de"]).default("en"),
});

export async function generateAgreement(
  input: z.infer<typeof generateSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor } = await requireActor();
    const parsed = generateSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid agreement generation");
    }
    if (!can(actor, "booking.generate_agreement")) {
      throw new AppError("forbidden", "Cannot generate agreement");
    }

    const { booking, profile, party } = await loadBookingAccess(
      actor,
      parsed.data.bookingId,
    );
    if (party !== "venue" && party !== "entertainer" && party !== "staff") {
      throw new AppError("forbidden", "Not a party to this booking");
    }
    if (!canGenerateAgreement(booking.state)) {
      throw new AppError(
        "invalid_transition",
        `Cannot generate agreement while booking is ${booking.state}`,
      );
    }
    if (
      !canActorTransitionBooking(
        booking.state as BookingState,
        "agreement_generated",
        party,
      )
    ) {
      throw new AppError("invalid_transition", "Illegal agreement transition");
    }

    const existing = await getAgreementForBooking(booking.id);
    if (existing) {
      throw new AppError("conflict", "Agreement already generated");
    }

    const db = getDb();
    const [agreed] = await db
      .select()
      .from(bookingTerms)
      .where(eq(bookingTerms.bookingId, booking.id))
      .orderBy(desc(bookingTerms.version));
    if (!agreed?.acceptedAt) {
      throw new AppError("validation", "Accepted terms required");
    }

    const venue = await db.query.venues.findFirst({
      where: eq(venues.id, booking.venueId),
    });
    if (!venue) {
      throw new AppError("not_found", "Venue not found");
    }

    const venueOwnerUserId = await getVenueOwnerUserId(booking.venueId);
    if (!venueOwnerUserId) {
      throw new AppError("validation", "Venue owner required to sign");
    }

    const { german, english } = await ensureTemplates();
    const rendered = renderAgreementDocuments({
      germanTemplate: german,
      englishTemplate: english,
      terms: {
        actName: profile.actName,
        venueName: venue.name,
        startsAtIso: agreed.startsAt.toISOString(),
        endsAtIso: agreed.endsAt.toISOString(),
        timezone: agreed.timezone,
        feeCents: agreed.feeCents,
        currency: agreed.currency,
        performanceFormat: agreed.performanceFormat,
        cancellationTerms: agreed.cancellationTerms,
        productionObligations: agreed.productionObligations,
        depositTerms: agreed.depositTerms,
        termsVersion: agreed.version,
      },
    });

    const venueOwner = await db.query.users.findFirst({
      where: eq(users.id, venueOwnerUserId),
    });
    const entertainerUser = await db.query.users.findFirst({
      where: eq(users.id, profile.userId),
    });
    const signerEmails = [venueOwner?.email, entertainerUser?.email].filter(
      Boolean,
    ) as string[];

    const provider = getESignProviderForGeneration();
    let agreementId: string | undefined;

    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(agreements)
        .values({
          bookingId: booking.id,
          bookingTermsId: agreed.id,
          germanTemplateVersion: rendered.germanTemplateVersion,
          englishTemplateVersion: rendered.englishTemplateVersion,
          germanBody: rendered.germanBody,
          englishBody: rendered.englishBody,
          provider: provider.name,
          status: "sent",
        })
        .returning();
      if (!created) {
        throw new AppError("validation", "Failed to create agreement");
      }
      agreementId = created.id;

      const envelope = await provider.createEnvelope({
        agreementId: created.id,
        germanControlling: true,
        signerEmails,
      });

      await tx
        .update(agreements)
        .set({
          providerEnvelopeId: envelope.providerEnvelopeId,
          updatedAt: new Date(),
        })
        .where(eq(agreements.id, created.id));

      await tx.insert(signatures).values([
        {
          agreementId: created.id,
          signerUserId: venueOwnerUserId,
          partyRole: "venue",
          status: "pending",
          providerReference: `${envelope.providerEnvelopeId}:venue`,
        },
        {
          agreementId: created.id,
          signerUserId: profile.userId,
          partyRole: "entertainer",
          status: "pending",
          providerReference: `${envelope.providerEnvelopeId}:entertainer`,
        },
      ]);

      await bumpBookingVersion(tx, booking, parsed.data.expectedVersion, {
        state: "agreement_generated",
      });

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "booking.agreement_generated",
        subjectType: "booking",
        subjectId: booking.id,
        metadata: {
          agreementId: created.id,
          provider: provider.name,
          sandbox: provider.name === "sandbox",
          germanTemplateVersion: rendered.germanTemplateVersion,
          englishTemplateVersion: rendered.englishTemplateVersion,
        },
      });
    });

    revalidatePath(`/${parsed.data.locale}/marketplace/bookings`);
    revalidatePath(
      `/${parsed.data.locale}/marketplace/bookings/${parsed.data.bookingId}`,
    );
    return { ok: true, ...(agreementId ? { id: agreementId } : {}) };
  } catch (error) {
    return toActionError(error);
  }
}

const signSchema = z.object({
  bookingId: z.string().uuid(),
  agreementId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  locale: z.enum(["en", "de"]).default("en"),
});

export async function signAgreementSandbox(
  input: z.infer<typeof signSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor } = await requireActor();
    const parsed = signSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid signature");
    }
    if (!can(actor, "booking.sign_agreement")) {
      throw new AppError("forbidden", "Cannot sign agreement");
    }

    const { booking, party } = await loadBookingAccess(
      actor,
      parsed.data.bookingId,
    );
    if (party !== "venue" && party !== "entertainer") {
      throw new AppError("forbidden", "Only designated parties may sign");
    }

    const agreementBundle = await getAgreementForBooking(booking.id);
    if (
      !agreementBundle ||
      agreementBundle.agreement.id !== parsed.data.agreementId
    ) {
      throw new AppError("not_found", "Agreement not found");
    }
    if (agreementBundle.agreement.provider !== "sandbox") {
      throw new AppError(
        "validation",
        "Only sandbox signatures are available until a provider is configured",
      );
    }

    const target = agreementBundle.signatures.find(
      (row) => row.signerUserId === session.user.id,
    );
    if (!target) {
      throw new AppError(
        "forbidden",
        "You are not the designated signer for this agreement",
      );
    }
    if (target.status === "signed") {
      throw new AppError("conflict", "Already signed");
    }

    const db = getDb();
    const agreed = await db.query.bookingTerms.findFirst({
      where: eq(bookingTerms.id, agreementBundle.agreement.bookingTermsId),
    });
    if (!agreed?.acceptedAt) {
      throw new AppError("validation", "Accepted terms missing");
    }

    await db.transaction(async (tx) => {
      await tx
        .update(signatures)
        .set({
          status: "signed",
          signedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(signatures.id, target.id));

      const refreshed = await tx
        .select()
        .from(signatures)
        .where(eq(signatures.agreementId, agreementBundle.agreement.id));
      const progress = signatureProgress({ signatures: refreshed });

      let working = booking;
      let expectedVersion = parsed.data.expectedVersion;

      if (progress === "partial" && booking.state === "agreement_generated") {
        if (
          !canActorTransitionBooking(
            "agreement_generated",
            "partially_signed",
            "system",
          )
        ) {
          throw new AppError(
            "invalid_transition",
            "Cannot mark partially signed",
          );
        }
        working = await bumpBookingVersion(tx, working, expectedVersion, {
          state: "partially_signed",
        });
        expectedVersion = working.version;
        await tx
          .update(agreements)
          .set({ status: "partially_signed", updatedAt: new Date() })
          .where(eq(agreements.id, agreementBundle.agreement.id));
      }

      if (progress === "complete") {
        if (working.state === "agreement_generated") {
          working = await bumpBookingVersion(tx, working, expectedVersion, {
            state: "partially_signed",
          });
          expectedVersion = working.version;
        }

        if (
          !canActorTransitionBooking(
            working.state as BookingState,
            "confirmed",
            "system",
          )
        ) {
          throw new AppError("invalid_transition", "Cannot confirm booking");
        }

        const venue = await tx.query.venues.findFirst({
          where: eq(venues.id, booking.venueId),
        });
        if (!venue) {
          throw new AppError("not_found", "Venue not found");
        }

        let spaceId = await getPrimaryVenueSpaceId(booking.venueId);
        if (!spaceId) {
          const space = await ensureDefaultVenueSpace(
            booking.venueId,
            venue.name,
          );
          spaceId = space.id;
        }

        const entertainerConflicts = await findOverlappingBlockingEntries({
          ownerType: "entertainer",
          ownerId: booking.entertainerProfileId,
          startsAt: agreed.startsAt,
          endsAt: agreed.endsAt,
          excludeBookingId: booking.id,
        });
        const venueConflicts = await findOverlappingBlockingEntries({
          ownerType: "venue_space",
          ownerId: spaceId,
          startsAt: agreed.startsAt,
          endsAt: agreed.endsAt,
          excludeBookingId: booking.id,
        });
        if (entertainerConflicts.length + venueConflicts.length > 0) {
          throw new AppError(
            "conflict",
            "Calendar conflict blocks confirmation",
          );
        }

        await bumpBookingVersion(tx, working, expectedVersion, {
          state: "confirmed",
        });

        await upsertBookingCalendarEntry(tx, {
          ownerType: "entertainer",
          ownerId: booking.entertainerProfileId,
          startsAt: agreed.startsAt,
          endsAt: agreed.endsAt,
          state: "confirmed",
          bookingId: booking.id,
        });
        await upsertBookingCalendarEntry(tx, {
          ownerType: "venue_space",
          ownerId: spaceId,
          startsAt: agreed.startsAt,
          endsAt: agreed.endsAt,
          state: "confirmed",
          bookingId: booking.id,
        });

        await tx
          .update(agreements)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(agreements.id, agreementBundle.agreement.id));
      }

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "booking.signature_sandbox",
        subjectType: "booking",
        subjectId: booking.id,
        metadata: {
          agreementId: agreementBundle.agreement.id,
          signatureId: target.id,
          partyRole: target.partyRole,
          progress,
          note: "Sandbox signature — not a production legal e-signature",
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
