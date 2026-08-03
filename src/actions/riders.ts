"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import { listRiderFilesForProfile } from "@/src/db/queries/admin-ops";
import { getActorContext } from "@/src/db/queries/actor";
import {
  auditEvents,
  entertainerProfiles,
  riderFiles,
} from "@/src/db/schema/marketplace";
import { AppError } from "@/src/domain/errors";
import { can } from "@/src/domain/permissions";
import {
  sanitizeRiderFilename,
  validateRiderUploadInput,
} from "@/src/domain/rider";
import { checkRateLimit, rateLimitKey } from "@/src/domain/rate-limit";
import { getFileStore, isFileStoreConfigured } from "@/src/integrations/files";

export type ActionResult =
  | { ok: true; id?: string; uploadUrl?: string; key?: string }
  | { ok: false; code: string; message: string };

function toActionError(error: unknown): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, code: error.code, message: error.message };
  }
  throw error;
}

const registerSchema = z.object({
  entertainerProfileId: z.string().uuid(),
  mimeType: z.string().trim().min(1),
  sizeBytes: z.coerce.number().int().positive(),
  checksum: z.string().trim().min(64).max(64),
  originalFilename: z.string().trim().max(255).optional(),
  locale: z.enum(["en", "de"]).default("en"),
});

export async function registerRiderUpload(
  input: z.infer<typeof registerSchema>,
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new AppError("unauthorized", "Sign in required");
    }
    checkRateLimit({
      key: rateLimitKey("rider.upload", session.user.id),
      limit: 10,
      windowMs: 60_000,
    });

    const actor = await getActorContext(session.user.id);
    if (!actor || !can(actor, "entertainer.manage_own_profile")) {
      throw new AppError("forbidden", "Entertainer profile required");
    }
    if (!isFileStoreConfigured()) {
      throw new AppError(
        "validation",
        "Private Blob storage is not provisioned. Set FILE_STORE=sandbox for local metadata-only demos, or BLOB_READ_WRITE_TOKEN after Vercel Blob is linked.",
      );
    }

    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid rider upload");
    }
    const check = validateRiderUploadInput(parsed.data);
    if (!check.ok) {
      throw new AppError("validation", check.reason);
    }

    const db = getDb();
    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.id, parsed.data.entertainerProfileId),
    });
    if (!profile || profile.userId !== session.user.id) {
      throw new AppError("forbidden", "Not your entertainer profile");
    }

    const store = getFileStore();
    const intent = await store.createUpload({
      ownerUserId: session.user.id,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      checksum: parsed.data.checksum,
    });

    const [created] = await db
      .insert(riderFiles)
      .values({
        ownerUserId: session.user.id,
        entertainerProfileId: profile.id,
        blobKey: intent.key,
        originalFilename: parsed.data.originalFilename
          ? sanitizeRiderFilename(parsed.data.originalFilename)
          : null,
        mimeType: parsed.data.mimeType,
        sizeBytes: parsed.data.sizeBytes,
        checksum: parsed.data.checksum.toLowerCase(),
        scanStatus: store.name === "sandbox" ? "awaiting_blob" : "pending",
      })
      .returning();
    if (!created) {
      throw new AppError("validation", "Failed to register rider");
    }

    await db.insert(auditEvents).values({
      actorUserId: session.user.id,
      action: "rider.registered",
      subjectType: "rider_file",
      subjectId: created.id,
      metadata: {
        store: store.name,
        mimeType: created.mimeType,
        sizeBytes: created.sizeBytes,
        note: "Metadata only; no permanent public URL stored",
      },
    });

    revalidatePath(`/${parsed.data.locale}/profile`);
    return {
      ok: true,
      id: created.id,
      uploadUrl: intent.uploadUrl,
      key: intent.key,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listOwnRiderFiles(entertainerProfileId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];
  const db = getDb();
  const profile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.id, entertainerProfileId),
  });
  if (!profile || profile.userId !== session.user.id) return [];
  return listRiderFilesForProfile(entertainerProfileId);
}
