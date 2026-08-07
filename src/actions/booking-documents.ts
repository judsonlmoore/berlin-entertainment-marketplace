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
import { auditEvents, riderFiles } from "@/src/db/schema/marketplace";
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

    const { party } = await loadBookingAccess(actor, parsed.data.bookingId);
    if (party !== "venue" && party !== "entertainer" && party !== "staff") {
      throw new AppError("forbidden", "Not a party to this booking");
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

    await db.delete(riderFiles).where(eq(riderFiles.id, doc.id));
    await db.insert(auditEvents).values({
      actorUserId: auditUserId,
      action: "booking_document.removed",
      subjectType: "rider_file",
      subjectId: doc.id,
      metadata: {
        bookingId: parsed.data.bookingId,
        title: doc.title,
      },
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
