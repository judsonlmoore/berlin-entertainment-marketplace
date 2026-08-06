"use server";

import {
  type ActionResult,
  requireActor,
  toActionError,
} from "@/src/actions/_shared";
import { and, eq, type SQL } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/src/db/client";
import {
  auditEvents,
  entertainerProfiles,
  riderFiles,
} from "@/src/db/schema/marketplace";
import { AppError } from "@/src/domain/errors";
import { can } from "@/src/domain/permissions";
import {
  PROFILE_DOCUMENT_MAX,
  normalizeDocumentTitle,
  titleFromFilename,
} from "@/src/domain/profile-document";
import { deleteDocumentFile } from "@/src/integrations/document-file-store";

const localeSchema = z.enum(["en", "de"]);

const ownerFieldsSchema = z
  .object({
    entertainerProfileId: z.string().uuid().optional(),
    venueId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    const hasProfile = Boolean(data.entertainerProfileId);
    const hasVenue = Boolean(data.venueId);
    if (hasProfile === hasVenue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exactly one of entertainerProfileId or venueId is required",
      });
    }
  });

type DocumentOwner =
  | {
      kind: "entertainer";
      entertainerProfileId: string;
      ownerFilter: SQL;
      subjectType: "entertainer_profile";
      subjectId: string;
    }
  | {
      kind: "venue";
      venueId: string;
      ownerFilter: SQL;
      subjectType: "venue";
      subjectId: string;
    };

async function requireDocumentOwner(input: {
  entertainerProfileId?: string | undefined;
  venueId?: string | undefined;
}): Promise<{
  actor: Awaited<ReturnType<typeof requireActor>>["actor"];
  auditUserId: string;
  db: ReturnType<typeof getDb>;
  owner: DocumentOwner;
}> {
  const { actor, auditUserId } = await requireActor();
  const db = getDb();

  if (input.entertainerProfileId && !input.venueId) {
    if (!can(actor, "entertainer.manage_own_profile")) {
      throw new AppError("forbidden", "Not your entertainer profile");
    }
    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.id, input.entertainerProfileId),
    });
    if (!profile || profile.userId !== actor.userId) {
      throw new AppError("forbidden", "Not your entertainer profile");
    }
    return {
      actor,
      auditUserId,
      db,
      owner: {
        kind: "entertainer",
        entertainerProfileId: profile.id,
        ownerFilter: eq(riderFiles.entertainerProfileId, profile.id),
        subjectType: "entertainer_profile",
        subjectId: profile.id,
      },
    };
  }

  if (input.venueId && !input.entertainerProfileId) {
    if (!can(actor, "venue.manage", { venueId: input.venueId })) {
      throw new AppError("forbidden", "Not your venue");
    }
    return {
      actor,
      auditUserId,
      db,
      owner: {
        kind: "venue",
        venueId: input.venueId,
        ownerFilter: eq(riderFiles.venueId, input.venueId),
        subjectType: "venue",
        subjectId: input.venueId,
      },
    };
  }

  throw new AppError(
    "validation",
    "Exactly one of entertainerProfileId or venueId is required",
  );
}

const removeSchema = ownerFieldsSchema.and(
  z.object({
    documentId: z.string().uuid(),
    locale: localeSchema,
  }),
);

export async function removeProfileDocument(
  input: z.infer<typeof removeSchema>,
): Promise<ActionResult> {
  try {
    const parsed = removeSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid document removal");
    }
    const { auditUserId, owner, db } = await requireDocumentOwner(parsed.data);

    const doc = await db.query.riderFiles.findFirst({
      where: and(
        eq(riderFiles.id, parsed.data.documentId),
        owner.ownerFilter,
      ),
    });
    if (!doc) {
      throw new AppError("not_found", "Document not found");
    }

    // Delete the row first so a failed DB write never leaves a broken editor entry.
    await db.delete(riderFiles).where(eq(riderFiles.id, doc.id));
    await db.insert(auditEvents).values({
      actorUserId: auditUserId,
      action: "profile_document.removed",
      subjectType: "rider_file",
      subjectId: doc.id,
      metadata: { title: doc.title },
    });
    try {
      await deleteDocumentFile(doc.blobKey);
    } catch {
      // Best-effort blob cleanup; the row is already gone.
    }
    return { ok: true, id: doc.id };
  } catch (error) {
    return toActionError(error);
  }
}

const reorderSchema = ownerFieldsSchema.and(
  z.object({
    orderedIds: z.array(z.string().uuid()).min(1).max(PROFILE_DOCUMENT_MAX),
    locale: localeSchema,
  }),
);

export async function reorderProfileDocuments(
  input: z.infer<typeof reorderSchema>,
): Promise<ActionResult> {
  try {
    const parsed = reorderSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid document reorder");
    }
    const { auditUserId, owner, db } = await requireDocumentOwner(parsed.data);

    const existing = await db
      .select({ id: riderFiles.id })
      .from(riderFiles)
      .where(owner.ownerFilter);
    const existingIds = new Set(existing.map((row) => row.id));
    if (
      parsed.data.orderedIds.length !== existingIds.size ||
      parsed.data.orderedIds.some((id) => !existingIds.has(id))
    ) {
      throw new AppError("validation", "Reorder must include all documents");
    }

    await db.transaction(async (tx) => {
      for (const [index, id] of parsed.data.orderedIds.entries()) {
        await tx
          .update(riderFiles)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(eq(riderFiles.id, id));
      }
      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: "profile_document.reordered",
        subjectType: owner.subjectType,
        subjectId: owner.subjectId,
        metadata: { count: parsed.data.orderedIds.length },
      });
    });
    return { ok: true, id: owner.subjectId };
  } catch (error) {
    return toActionError(error);
  }
}

const updateSchema = ownerFieldsSchema.and(
  z.object({
    documentId: z.string().uuid(),
    title: z.string().max(120),
    visibility: z.enum(["marketplace", "engagement"]),
    locale: localeSchema,
  }),
);

export async function updateProfileDocumentMeta(
  input: z.infer<typeof updateSchema>,
): Promise<ActionResult> {
  try {
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid document update");
    }
    const { auditUserId, owner, db } = await requireDocumentOwner(parsed.data);

    const doc = await db.query.riderFiles.findFirst({
      where: and(
        eq(riderFiles.id, parsed.data.documentId),
        owner.ownerFilter,
      ),
    });
    if (!doc) {
      throw new AppError("not_found", "Document not found");
    }

    // Uploads may store an empty title; resolve a stable display title for updates.
    const title =
      normalizeDocumentTitle(parsed.data.title) ||
      normalizeDocumentTitle(doc.title) ||
      titleFromFilename(doc.originalFilename ?? "document.pdf");

    await db
      .update(riderFiles)
      .set({
        title,
        visibility: parsed.data.visibility,
        updatedAt: new Date(),
      })
      .where(eq(riderFiles.id, doc.id));

    await db.insert(auditEvents).values({
      actorUserId: auditUserId,
      action: "profile_document.updated",
      subjectType: "rider_file",
      subjectId: doc.id,
      metadata: {
        title,
        visibility: parsed.data.visibility,
      },
    });
    return { ok: true, id: doc.id };
  } catch (error) {
    return toActionError(error);
  }
}
