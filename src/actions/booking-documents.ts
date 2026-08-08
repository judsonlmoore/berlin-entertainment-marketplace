"use server";

import {
  type ActionResult,
  requireActor,
  toActionError,
} from "@/src/actions/_shared";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/src/db/client";
import { loadBookingAccess } from "@/src/actions/_booking-access";
import { auditEvents, bookings, riderFiles } from "@/src/db/schema/marketplace";
import { bookingDocumentsLocked } from "@/src/domain/agreement";
import { AppError } from "@/src/domain/errors";
import { deleteDocumentFile } from "@/src/integrations/document-file-store";

const schema = z.object({
  documentId: z.string().uuid(),
  bookingId: z.string().uuid(),
  locale: z.enum(["en", "de"]).default("en"),
});

/** Uploader may delete their own booking-scoped PDF. */
export async function removeBookingDocument(
  input: z.infer<typeof schema>,
): Promise<ActionResult> {
  try {
    const { actor, auditUserId } = await requireActor();
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid document removal");
    }

    const { booking, party } = await loadBookingAccess(
      actor,
      parsed.data.bookingId,
    );
    if (party !== "venue" && party !== "entertainer" && party !== "staff") {
      throw new AppError("forbidden", "Not a party to this booking");
    }
    if (bookingDocumentsLocked(booking.state)) {
      throw new AppError(
        "validation",
        "Documents are locked after the agreement package is generated",
      );
    }

    const db = getDb();
    const doc = await db.query.riderFiles.findFirst({
      where: and(
        eq(riderFiles.id, parsed.data.documentId),
        eq(riderFiles.bookingId, parsed.data.bookingId),
      ),
    });
    if (!doc) {
      throw new AppError("not_found", "Document not found");
    }
    if (doc.ownerUserId !== actor.userId && party !== "staff") {
      throw new AppError("forbidden", "Only the uploader can delete this file");
    }

    // Re-check lock under a booking row lock so concurrent agreement
    // generation cannot advance state between the early check and delete.
    await db.transaction(async (tx) => {
      const [lockedBooking] = await tx
        .select({ id: bookings.id, state: bookings.state })
        .from(bookings)
        .where(eq(bookings.id, parsed.data.bookingId))
        .for("update");
      if (!lockedBooking) {
        throw new AppError("not_found", "Booking not found");
      }
      if (bookingDocumentsLocked(lockedBooking.state)) {
        throw new AppError(
          "validation",
          "Documents are locked after the agreement package is generated",
        );
      }

      await tx.delete(riderFiles).where(eq(riderFiles.id, doc.id));
      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: "booking_document.removed",
        subjectType: "rider_file",
        subjectId: doc.id,
        metadata: {
          bookingId: parsed.data.bookingId,
          title: doc.title,
        },
      });
    });

    try {
      await deleteDocumentFile(doc.blobKey);
    } catch {
      // best-effort
    }

    revalidatePath(
      `/${parsed.data.locale}/marketplace/bookings/${parsed.data.bookingId}`,
    );
    return { ok: true, id: doc.id };
  } catch (error) {
    return toActionError(error);
  }
}
