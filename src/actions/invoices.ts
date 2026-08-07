"use server";

import {
  type ActionResult,
  requireActor,
  toActionError,
} from "@/src/actions/_shared";
import { loadBookingAccess } from "@/src/actions/_booking-access";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/src/db/client";
import { getVenueOwnerUserId } from "@/src/db/queries/agreements";
import { getLegalIdentityForUser } from "@/src/db/queries/legal-identity";
import {
  auditEvents,
  bookingInvoices,
  bookingTerms,
} from "@/src/db/schema/marketplace";
import { canGenerateBookingInvoice } from "@/src/domain/agreement";
import { AppError } from "@/src/domain/errors";
import {
  isLegalIdentityComplete,
  type LegalIdentityFields,
} from "@/src/domain/legal-identity";
import { can } from "@/src/domain/permissions";
import { saveDocumentFile } from "@/src/integrations/document-file-store";
import { getInvoiceProvider } from "@/src/integrations/invoice/provider";

const schema = z.object({
  bookingId: z.string().uuid(),
  locale: z.enum(["en", "de"]).default("en"),
  /** Rebuild PDF when an invoice already exists (sandbox specimen). */
  force: z.boolean().optional(),
});

function toPartySnapshot(identity: LegalIdentityFields) {
  return {
    legalName: identity.legalName,
    tradingName: identity.tradingName,
    addressLine1: identity.addressLine1,
    addressLine2: identity.addressLine2,
    postalCode: identity.postalCode,
    city: identity.city,
    countryCode: identity.countryCode,
    taxId: identity.taxId,
    invoiceEmail: identity.invoiceEmail,
    iban: identity.iban,
    bic: identity.bic,
    paymentNote: identity.paymentNote,
  };
}

export async function generateBookingInvoice(
  input: z.infer<typeof schema>,
): Promise<ActionResult> {
  try {
    const { actor, auditUserId } = await requireActor();
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid invoice request");
    }
    if (!can(actor, "booking.view")) {
      throw new AppError("forbidden", "Cannot generate invoice");
    }

    const { booking, profile, party } = await loadBookingAccess(
      actor,
      parsed.data.bookingId,
    );
    if (party !== "venue" && party !== "entertainer" && party !== "staff") {
      throw new AppError("forbidden", "Not a party to this booking");
    }
    if (!canGenerateBookingInvoice(booking.state)) {
      throw new AppError(
        "validation",
        "Invoice available only after booking is confirmed",
      );
    }

    const db = getDb();
    const existing = await db.query.bookingInvoices.findFirst({
      where: eq(bookingInvoices.bookingId, booking.id),
    });
    if (
      existing?.status === "generated" &&
      existing.blobKey &&
      !parsed.data.force
    ) {
      throw new AppError("conflict", "Invoice already generated");
    }

    const [agreedTerms] = await db
      .select()
      .from(bookingTerms)
      .where(eq(bookingTerms.bookingId, booking.id))
      .orderBy(desc(bookingTerms.version))
      .limit(1);
    if (!agreedTerms?.acceptedAt) {
      throw new AppError("validation", "Accepted terms required");
    }

    const venueOwnerUserId = await getVenueOwnerUserId(booking.venueId);
    if (!venueOwnerUserId) {
      throw new AppError("validation", "Venue owner required");
    }

    const sellerLegal = await getLegalIdentityForUser(profile.userId);
    const buyerLegal = await getLegalIdentityForUser(venueOwnerUserId);
    if (
      !isLegalIdentityComplete(sellerLegal) ||
      !isLegalIdentityComplete(buyerLegal)
    ) {
      throw new AppError(
        "validation",
        "Both parties need complete legal identity before invoice generation",
      );
    }

    const [draft] = existing
      ? [existing]
      : await db
          .insert(bookingInvoices)
          .values({
            bookingId: booking.id,
            status: "draft",
            format: "sandbox_pdf",
            sellerSnapshot: toPartySnapshot(sellerLegal!),
            buyerSnapshot: toPartySnapshot(buyerLegal!),
          })
          .returning();

    if (!draft) {
      throw new AppError("validation", "Failed to create invoice row");
    }

    const provider = getInvoiceProvider();
    const artifact = await provider.generate({
      invoiceId: draft.id,
      bookingId: booking.id,
      locale: parsed.data.locale,
      currency: agreedTerms.currency,
      feeCents: agreedTerms.feeCents,
      performanceFormat: agreedTerms.performanceFormat,
      startsAtIso: agreedTerms.startsAt.toISOString(),
      endsAtIso: agreedTerms.endsAt.toISOString(),
      seller: toPartySnapshot(sellerLegal!),
      buyer: toPartySnapshot(buyerLegal!),
    });

    const stored = await saveDocumentFile({
      ownerUserId: actor.userId,
      mimeType: artifact.contentType,
      bytes: artifact.bytes,
    });

    await db
      .update(bookingInvoices)
      .set({
        status: "generated",
        format: artifact.format,
        blobKey: stored.blobKey,
        sellerSnapshot: toPartySnapshot(sellerLegal!),
        buyerSnapshot: toPartySnapshot(buyerLegal!),
        validationNotes: artifact.validationNotes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(bookingInvoices.id, draft.id));

    await db.insert(auditEvents).values({
      actorUserId: auditUserId,
      action: "booking_invoice.generated",
      subjectType: "booking",
      subjectId: booking.id,
      metadata: {
        invoiceId: draft.id,
        format: artifact.format,
        provider: provider.name,
      },
    });

    revalidatePath(`/marketplace/bookings/${booking.id}`);
    revalidatePath(`/[locale]/marketplace/bookings/${booking.id}`, "page");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
