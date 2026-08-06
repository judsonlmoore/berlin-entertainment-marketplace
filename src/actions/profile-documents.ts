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
} from "@/src/domain/profile-document";
import { deleteDocumentFile } from "@/src/integrations/document-file-store";

const localeSchema = z.enum(["en", "de"]);

async function requireEntertainerOwner(entertainerProfileId: string) {
  const { actor, auditUserId } = await requireActor();
  if (!can(actor, "entertainer.manage_own_profile")) {
    throw new AppError("forbidden", "Not your entertainer profile");
  }

  const db = getDb();
  const profile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.id, entertainerProfileId),
  });
  if (!profile || profile.userId !== actor.userId) {
    throw new AppError("forbidden", "Not your entertainer profile");
  }

  return { actor, auditUserId, profile, db };
}

const removeSchema = z.object({
  entertainerProfileId: z.string().uuid(),
  documentId: z.string().uuid(),
  locale: localeSchema,
});

export async function removeProfileDocument(
  input: z.infer<typeof removeSchema>,
): Promise<ActionResult> {
  try {
    const parsed = removeSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid document removal");
    }
    const { auditUserId, profile, db } = await requireEntertainerOwner(
      parsed.data.entertainerProfileId,
    );

    const doc = await db.query.riderFiles.findFirst({
      where: and(
        eq(riderFiles.id, parsed.data.documentId),
        eq(riderFiles.entertainerProfileId, profile.id),
      ),
    });
    if (!doc) {
      throw new AppError("not_found", "Document not found");
    }

    await deleteDocumentFile(doc.blobKey);
    await db.delete(riderFiles).where(eq(riderFiles.id, doc.id));
    await db.insert(auditEvents).values({
      actorUserId: auditUserId,
      action: "profile_document.removed",
      subjectType: "rider_file",
      subjectId: doc.id,
      metadata: { title: doc.title },
    });

    revalidatePath(`/${parsed.data.locale}/profile`);
    return { ok: true, id: doc.id };
  } catch (error) {
    return toActionError(error);
  }
}

const reorderSchema = z.object({
  entertainerProfileId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1).max(PROFILE_DOCUMENT_MAX),
  locale: localeSchema,
});

export async function reorderProfileDocuments(
  input: z.infer<typeof reorderSchema>,
): Promise<ActionResult> {
  try {
    const parsed = reorderSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid document reorder");
    }
    const { auditUserId, profile, db } = await requireEntertainerOwner(
      parsed.data.entertainerProfileId,
    );

    const existing = await db
      .select({ id: riderFiles.id })
      .from(riderFiles)
      .where(eq(riderFiles.entertainerProfileId, profile.id));
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
        subjectType: "entertainer_profile",
        subjectId: profile.id,
        metadata: { count: parsed.data.orderedIds.length },
      });
    });

    revalidatePath(`/${parsed.data.locale}/profile`);
    return { ok: true, id: profile.id };
  } catch (error) {
    return toActionError(error);
  }
}

const updateSchema = z.object({
  entertainerProfileId: z.string().uuid(),
  documentId: z.string().uuid(),
  title: z.string().min(1).max(120),
  visibility: z.enum(["marketplace", "engagement"]),
  locale: localeSchema,
});

export async function updateProfileDocumentMeta(
  input: z.infer<typeof updateSchema>,
): Promise<ActionResult> {
  try {
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid document update");
    }
    const { auditUserId, profile, db } = await requireEntertainerOwner(
      parsed.data.entertainerProfileId,
    );

    const title = normalizeDocumentTitle(parsed.data.title);
    if (!title) {
      throw new AppError("validation", "Document title is required");
    }

    const doc = await db.query.riderFiles.findFirst({
      where: and(
        eq(riderFiles.id, parsed.data.documentId),
        eq(riderFiles.entertainerProfileId, profile.id),
      ),
    });
    if (!doc) {
      throw new AppError("not_found", "Document not found");
    }

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

    revalidatePath(`/${parsed.data.locale}/profile`);
    return { ok: true, id: doc.id };
  } catch (error) {
    return toActionError(error);
  }
}
