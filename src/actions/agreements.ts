"use server";

import { randomUUID } from "node:crypto";
import {
  type ActionResult,
  requireActor,
  toActionError,
} from "@/src/actions/_shared";
import {
  bumpBookingVersion,
  loadBookingAccess,
} from "@/src/actions/_booking-access";
import { desc, eq, inArray } from "drizzle-orm";
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
import { getLegalIdentityForUser } from "@/src/db/queries/legal-identity";
import {
  listDocumentsForBooking,
  listDocumentsForOwner,
} from "@/src/db/queries/rider-access";
import {
  agreementTemplates,
  agreements,
  auditEvents,
  bookingTerms,
  riderFiles,
  signatures,
  venues,
} from "@/src/db/schema/marketplace";
import {
  canGenerateAgreement,
  renderAgreementDocuments,
  signatureProgress,
} from "@/src/domain/agreement";
import { matchesConfirmationPhrase } from "@/src/domain/agreement-confirm";
import { buildAgreementPackagePdf } from "@/src/domain/agreement-package-pdf";
import {
  canActorTransitionBooking,
  type BookingState,
} from "@/src/domain/booking";
import { AppError } from "@/src/domain/errors";
import {
  isLegalIdentityComplete,
  type LegalIdentityFields,
} from "@/src/domain/legal-identity";
import { can } from "@/src/domain/permissions";
import { loadDocumentFile, saveDocumentFile } from "@/src/integrations/document-file-store";
import { getESignProviderForGeneration } from "@/src/integrations/esign";

function snapshotLegal(identity: LegalIdentityFields) {
  return {
    entityType: identity.entityType,
    legalName: identity.legalName,
    tradingName: identity.tradingName,
    addressLine1: identity.addressLine1,
    addressLine2: identity.addressLine2,
    postalCode: identity.postalCode,
    city: identity.city,
    countryCode: identity.countryCode,
    taxId: identity.taxId,
    companyRegisterId: identity.companyRegisterId,
    invoiceEmail: identity.invoiceEmail,
    iban: identity.iban,
    bic: identity.bic,
    paymentNote: identity.paymentNote,
  };
}

async function ensureTemplates() {
  const latest = await getLatestSandboxTemplates();
  const hasMuster =
    latest.german?.version.includes("muster") &&
    latest.english?.version.includes("muster");
  if (hasMuster && latest.german && latest.english) {
    return { german: latest.german, english: latest.english };
  }

  const db = getDb();
  const [german] = await db
    .insert(agreementTemplates)
    .values({
      locale: "de",
      version: "de-muster-1",
      legalReviewStatus: "draft",
      body: [
        "Vereinbarung Version {{termsVersion}}",
        "",
        "Zwischen {{venueName}} (Veranstaltungsort) und {{actName}} (Act).",
        "",
        "Leistung",
        "{{startsAt}} – {{endsAt}} ({{timezone}})",
        "",
        "Honorar",
        "{{fee}}",
        "",
        "Format",
        "{{performanceFormat}}",
        "",
        "Storno",
        "{{cancellationTerms}}",
        "",
        "Produktion",
        "{{productionObligations}}",
        "",
        "Kaution",
        "{{depositTerms}}",
        "",
        "Der deutsche Text ist maßgeblich.",
      ].join("\n"),
    })
    .returning();
  const [english] = await db
    .insert(agreementTemplates)
    .values({
      locale: "en",
      version: "en-muster-1",
      legalReviewStatus: "draft",
      body: [
        "Agreement version {{termsVersion}}",
        "",
        "Between {{venueName}} (venue) and {{actName}} (act).",
        "",
        "Performance",
        "{{startsAt}} – {{endsAt}} ({{timezone}})",
        "",
        "Fee",
        "{{fee}}",
        "",
        "Format",
        "{{performanceFormat}}",
        "",
        "Cancellation",
        "{{cancellationTerms}}",
        "",
        "Production",
        "{{productionObligations}}",
        "",
        "Deposit",
        "{{depositTerms}}",
        "",
        "German text is controlling; English is a convenience translation.",
      ].join("\n"),
    })
    .returning();
  return { german: german!, english: english! };
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
    const { actor, auditUserId } = await requireActor();
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

    const entertainerLegal = await getLegalIdentityForUser(profile.userId);
    const venueLegal = await getLegalIdentityForUser(venueOwnerUserId);
    if (
      !isLegalIdentityComplete(entertainerLegal) ||
      !isLegalIdentityComplete(venueLegal)
    ) {
      throw new AppError(
        "validation",
        "Both parties need complete legal identity on Account before generating the agreement",
      );
    }

    const actDocs = await listDocumentsForOwner({
      entertainerProfileId: booking.entertainerProfileId,
    });
    const venueDocs = await listDocumentsForOwner({
      venueId: booking.venueId,
    });
    const bookingDocs = await listDocumentsForBooking(booking.id);
    const addendaSnapshot: Array<{
      id: string;
      title: string;
      source: "act_profile" | "venue_profile" | "booking";
      addendumNumber: number;
    }> = [];
    let addendumNumber = 1;
    for (const doc of actDocs) {
      addendaSnapshot.push({
        id: doc.id,
        title: doc.title.trim() || doc.originalFilename?.trim() || "PDF",
        source: "act_profile",
        addendumNumber: addendumNumber++,
      });
    }
    for (const doc of venueDocs) {
      addendaSnapshot.push({
        id: doc.id,
        title: doc.title.trim() || doc.originalFilename?.trim() || "PDF",
        source: "venue_profile",
        addendumNumber: addendumNumber++,
      });
    }
    for (const doc of bookingDocs) {
      addendaSnapshot.push({
        id: doc.id,
        title: doc.title.trim() || doc.originalFilename?.trim() || "PDF",
        source: "booking",
        addendumNumber: addendumNumber++,
      });
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

    const germanBody = rendered.germanBody;
    const englishBody = rendered.englishBody;
    const legalIdentitySnapshot = {
      entertainer: snapshotLegal(entertainerLegal!),
      venue: snapshotLegal(venueLegal!),
    };

    const venueOwner = await db.query.users.findFirst({
      where: eq(users.id, venueOwnerUserId),
    });
    const entertainerUser = await db.query.users.findFirst({
      where: eq(users.id, profile.userId),
    });
    const signerEmails = [venueOwner?.email, entertainerUser?.email].filter(
      Boolean,
    ) as string[];

    const docsById = new Map(
      [...actDocs, ...venueDocs, ...bookingDocs].map((d) => [d.id, d]),
    );
    const addendaForPdf = await Promise.all(
      addendaSnapshot.map(async (item) => {
        const doc = docsById.get(item.id);
        let pdfBytes: Uint8Array | null = null;
        if (doc?.blobKey) {
          const loaded = await loadDocumentFile(doc.blobKey);
          pdfBytes = loaded?.bytes ?? null;
        }
        return {
          addendumNumber: item.addendumNumber,
          title: item.title,
          pdfBytes,
        };
      }),
    );

    // Pre-create agreement id for PDF footer / cover reference
    const agreementIdForPdf = randomUUID();
    const packagePdf = await buildAgreementPackagePdf({
      agreementId: agreementIdForPdf,
      actName: profile.actName,
      venueName: venue.name,
      termsVersion: agreed.version,
      germanBody,
      englishBody,
      addenda: addendaForPdf,
    });

    const stored = await saveDocumentFile({
      ownerUserId: actor.userId,
      mimeType: "application/pdf",
      bytes: packagePdf.bytes,
    });

    const provider = getESignProviderForGeneration();
    let agreementId: string | undefined;

    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(agreements)
        .values({
          id: agreementIdForPdf,
          bookingId: booking.id,
          bookingTermsId: agreed.id,
          germanTemplateVersion: rendered.germanTemplateVersion,
          englishTemplateVersion: rendered.englishTemplateVersion,
          germanBody,
          englishBody,
          addendaSnapshot,
          legalIdentitySnapshot,
          packagePdfBlobKey: stored.blobKey,
          packageFingerprint: packagePdf.fingerprint,
          packagePageCount: packagePdf.pageCount,
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
        packageFingerprint: packagePdf.fingerprint,
        packagePdfBlobKey: stored.blobKey,
        packagePageCount: packagePdf.pageCount,
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
        actorUserId: auditUserId,
        action: "booking.agreement_generated",
        subjectType: "booking",
        subjectId: booking.id,
        metadata: {
          agreementId: created.id,
          provider: provider.name,
          sandbox: provider.name === "sandbox",
          germanTemplateVersion: rendered.germanTemplateVersion,
          englishTemplateVersion: rendered.englishTemplateVersion,
          packageFingerprint: packagePdf.fingerprint,
          packagePageCount: packagePdf.pageCount,
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

const ensurePackageSchema = z.object({
  bookingId: z.string().uuid(),
  agreementId: z.string().uuid(),
  locale: z.enum(["en", "de"]).default("en"),
  /** Rebuild cover/layout before any signature is recorded. */
  force: z.boolean().optional(),
});

/**
 * Backfill or rebuild the agreement package PDF (cover, MUSTER watermark, addenda).
 * Force rebuild is allowed only while no signature is signed.
 */
export async function ensureAgreementPackage(
  input: z.infer<typeof ensurePackageSchema>,
): Promise<ActionResult> {
  try {
    const { actor, auditUserId } = await requireActor();
    const parsed = ensurePackageSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid package request");
    }
    if (!can(actor, "booking.generate_agreement")) {
      throw new AppError("forbidden", "Cannot build agreement package");
    }

    const { booking, profile, party } = await loadBookingAccess(
      actor,
      parsed.data.bookingId,
    );
    if (party !== "venue" && party !== "entertainer" && party !== "staff") {
      throw new AppError("forbidden", "Not a party to this booking");
    }

    const agreementBundle = await getAgreementForBooking(booking.id);
    if (
      !agreementBundle ||
      agreementBundle.agreement.id !== parsed.data.agreementId
    ) {
      throw new AppError("not_found", "Agreement not found");
    }
    const agreement = agreementBundle.agreement;
    const anySigned = agreementBundle.signatures.some(
      (row) => row.status === "signed",
    );
    if (
      agreement.packagePdfBlobKey &&
      agreement.packageFingerprint &&
      !parsed.data.force
    ) {
      return { ok: true, id: agreement.id };
    }
    if (parsed.data.force && anySigned) {
      throw new AppError(
        "conflict",
        "Cannot rebuild the package after a signature has been recorded",
      );
    }

    const db = getDb();
    const venue = await db.query.venues.findFirst({
      where: eq(venues.id, booking.venueId),
      columns: { id: true, name: true },
    });
    if (!venue) {
      throw new AppError("not_found", "Venue not found");
    }

    const [agreed] = await db
      .select()
      .from(bookingTerms)
      .where(eq(bookingTerms.bookingId, booking.id))
      .orderBy(desc(bookingTerms.version));
    if (!agreed?.acceptedAt) {
      throw new AppError("validation", "Accepted terms required");
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
    const germanBody = rendered.germanBody;
    const englishBody = rendered.englishBody;

    const snapshot = (agreement.addendaSnapshot ?? []) as Array<{
      id: string;
      title: string;
      source: "act_profile" | "venue_profile" | "booking";
      addendumNumber: number;
    }>;
    const docIds = snapshot.map((item) => item.id);
    const docs =
      docIds.length > 0
        ? await db.query.riderFiles.findMany({
            where: inArray(riderFiles.id, docIds),
            columns: { id: true, blobKey: true },
          })
        : [];
    const docsById = new Map(docs.map((d) => [d.id, d]));

    const addendaForPdf = await Promise.all(
      snapshot.map(async (item) => {
        const doc = docsById.get(item.id);
        let pdfBytes: Uint8Array | null = null;
        if (doc?.blobKey) {
          const loaded = await loadDocumentFile(doc.blobKey);
          pdfBytes = loaded?.bytes ?? null;
        }
        return {
          addendumNumber: item.addendumNumber,
          title: item.title,
          pdfBytes,
        };
      }),
    );

    const packagePdf = await buildAgreementPackagePdf({
      agreementId: agreement.id,
      actName: profile.actName,
      venueName: venue.name,
      termsVersion: agreed.version,
      germanBody,
      englishBody,
      addenda: addendaForPdf,
    });

    const stored = await saveDocumentFile({
      ownerUserId: actor.userId,
      mimeType: "application/pdf",
      bytes: packagePdf.bytes,
    });

    const provider = getESignProviderForGeneration();
    const venueOwnerUserId = await getVenueOwnerUserId(booking.venueId);
    const venueOwner = venueOwnerUserId
      ? await db.query.users.findFirst({ where: eq(users.id, venueOwnerUserId) })
      : null;
    const entertainerUser = await db.query.users.findFirst({
      where: eq(users.id, profile.userId),
    });
    const signerEmails = [venueOwner?.email, entertainerUser?.email].filter(
      Boolean,
    ) as string[];

    const envelope = await provider.createEnvelope({
      agreementId: agreement.id,
      germanControlling: true,
      packageFingerprint: packagePdf.fingerprint,
      packagePdfBlobKey: stored.blobKey,
      packagePageCount: packagePdf.pageCount,
      signerEmails,
    });

    await db
      .update(agreements)
      .set({
        germanBody,
        englishBody,
        germanTemplateVersion: rendered.germanTemplateVersion,
        englishTemplateVersion: rendered.englishTemplateVersion,
        packagePdfBlobKey: stored.blobKey,
        packageFingerprint: packagePdf.fingerprint,
        packagePageCount: packagePdf.pageCount,
        providerEnvelopeId:
          agreement.providerEnvelopeId ?? envelope.providerEnvelopeId,
        updatedAt: new Date(),
      })
      .where(eq(agreements.id, agreement.id));

    await db.insert(auditEvents).values({
      actorUserId: auditUserId,
      action: "booking.agreement_package_built",
      subjectType: "booking",
      subjectId: booking.id,
      metadata: {
        agreementId: agreement.id,
        packageFingerprint: packagePdf.fingerprint,
        packagePageCount: packagePdf.pageCount,
        backfill: !parsed.data.force,
        rebuild: Boolean(parsed.data.force),
      },
    });

    revalidatePath(`/${parsed.data.locale}/marketplace/bookings`);
    revalidatePath(
      `/${parsed.data.locale}/marketplace/bookings/${parsed.data.bookingId}`,
    );
    return { ok: true, id: agreement.id };
  } catch (error) {
    return toActionError(error);
  }
}

const signSchema = z.object({
  bookingId: z.string().uuid(),
  agreementId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  confirmationPhrase: z.string().min(1).max(120),
  locale: z.enum(["en", "de"]).default("en"),
});

export async function signAgreementSandbox(
  input: z.infer<typeof signSchema>,
): Promise<ActionResult> {
  try {
    const { actor, auditUserId } = await requireActor();
    const parsed = signSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid signature");
    }
    if (!can(actor, "booking.sign_agreement")) {
      throw new AppError("forbidden", "Cannot sign agreement");
    }
    if (
      !matchesConfirmationPhrase(
        parsed.data.confirmationPhrase,
        parsed.data.locale,
      )
    ) {
      throw new AppError(
        "validation",
        parsed.data.locale === "de"
          ? 'Bitte geben Sie genau „Ich stimme zu“ ein'
          : 'Please type exactly “I agree”',
      );
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
    if (!agreementBundle.agreement.packageFingerprint) {
      throw new AppError("validation", "Agreement package fingerprint missing");
    }
    if (!agreementBundle.agreement.providerEnvelopeId) {
      throw new AppError("validation", "Agreement envelope missing");
    }

    const target = agreementBundle.signatures.find(
      (row) => row.signerUserId === actor.userId,
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

    const provider = getESignProviderForGeneration();
    const signerUser = await getDb().query.users.findFirst({
      where: eq(users.id, actor.userId),
      columns: { email: true },
    });
    await provider.recordSignerAcceptance({
      providerEnvelopeId: agreementBundle.agreement.providerEnvelopeId,
      signerUserId: actor.userId,
      signerEmail: signerUser?.email ?? actor.userId,
      confirmationPhrase: parsed.data.confirmationPhrase,
      packageFingerprint: agreementBundle.agreement.packageFingerprint,
      locale: parsed.data.locale,
    });

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
          confirmationPhrase: parsed.data.confirmationPhrase.trim(),
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

        const venueRow = await tx.query.venues.findFirst({
          where: eq(venues.id, booking.venueId),
        });
        if (!venueRow) {
          throw new AppError("not_found", "Venue not found");
        }

        let spaceId = await getPrimaryVenueSpaceId(booking.venueId);
        if (!spaceId) {
          const space = await ensureDefaultVenueSpace(
            booking.venueId,
            venueRow.name,
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
        actorUserId: auditUserId,
        action: "booking.signature_sandbox",
        subjectType: "booking",
        subjectId: booking.id,
        metadata: {
          agreementId: agreementBundle.agreement.id,
          signatureId: target.id,
          partyRole: target.partyRole,
          progress,
          packageFingerprint: agreementBundle.agreement.packageFingerprint,
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
