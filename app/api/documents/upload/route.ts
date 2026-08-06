import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import {
  auditEvents,
  entertainerProfiles,
  riderFiles,
} from "@/src/db/schema/marketplace";
import { can } from "@/src/domain/permissions";
import {
  PROFILE_DOCUMENT_MAX,
  titleFromFilename,
  validateProfileDocumentUpload,
} from "@/src/domain/profile-document";
import { sanitizeRiderFilename } from "@/src/domain/rider";
import {
  deleteDocumentFile,
  isDocumentStoreConfigured,
  saveDocumentFile,
} from "@/src/integrations/document-file-store";
import { resolveEffectiveActor } from "@/src/lib/effective-actor";
import { count, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

class DocumentLimitError extends Error {
  constructor() {
    super("document_limit");
    this.name = "DocumentLimitError";
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  if (!isDocumentStoreConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "blob_unconfigured",
        message:
          "Document storage is not configured. Set BLOB_READ_WRITE_TOKEN (or use local disk in development).",
      },
      { status: 503 },
    );
  }

  const resolved = await resolveEffectiveActor(session.user.id);
  if (!resolved) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }
  const { actor, auditUserId } = resolved;

  if (!can(actor, "entertainer.manage_own_profile")) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }

  const form = await request.formData();
  const entertainerProfileId = String(form.get("entertainerProfileId") ?? "");
  const rawTitle = String(form.get("title") ?? "");
  const visibility = String(form.get("visibility") ?? "engagement");
  const locale = String(form.get("locale") ?? "en");
  const file = form.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { ok: false, error: "file_required" },
      { status: 400 },
    );
  }

  const originalFilename = sanitizeRiderFilename(file.name);
  const check = validateProfileDocumentUpload({
    title: rawTitle.trim(),
    visibility,
    mimeType: file.type || "application/pdf",
    sizeBytes: file.size,
  });
  if (!check.ok) {
    return NextResponse.json(
      { ok: false, error: check.reason },
      { status: 400 },
    );
  }

  const db = getDb();
  const profile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.id, entertainerProfileId),
  });
  if (!profile || profile.userId !== actor.userId) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }

  const title = check.title || titleFromFilename(originalFilename);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = file.type || "application/pdf";

  let storedBlobKey: string | null = null;
  try {
    const stored = await saveDocumentFile({
      ownerUserId: actor.userId,
      mimeType,
      bytes,
    });
    storedBlobKey = stored.blobKey;

    const created = await db.transaction(async (tx) => {
      // Serialize uploads per profile so concurrent requests cannot exceed the cap.
      await tx
        .select({ id: entertainerProfiles.id })
        .from(entertainerProfiles)
        .where(eq(entertainerProfiles.id, profile.id))
        .for("update");

      const [docCount] = await tx
        .select({ value: count() })
        .from(riderFiles)
        .where(eq(riderFiles.entertainerProfileId, profile.id));
      if ((docCount?.value ?? 0) >= PROFILE_DOCUMENT_MAX) {
        throw new DocumentLimitError();
      }

      const [maxSort] = await tx
        .select({
          value: sql<number>`coalesce(max(${riderFiles.sortOrder}), -1)`,
        })
        .from(riderFiles)
        .where(eq(riderFiles.entertainerProfileId, profile.id));
      const nextSort = Number(maxSort?.value ?? -1) + 1;

      const [row] = await tx
        .insert(riderFiles)
        .values({
          ownerUserId: actor.userId,
          entertainerProfileId: profile.id,
          blobKey: stored.blobKey,
          title,
          visibility: check.visibility,
          sortOrder: nextSort,
          originalFilename,
          mimeType,
          sizeBytes: file.size,
          checksum: "0".repeat(64),
          scanStatus: "clean",
        })
        .returning();

      if (!row) {
        throw new Error("create_failed");
      }

      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: "profile_document.uploaded",
        subjectType: "rider_file",
        subjectId: row.id,
        metadata: {
          title: row.title,
          visibility: row.visibility,
          sizeBytes: row.sizeBytes,
        },
      });

      return row;
    });

    return NextResponse.json({
      ok: true,
      id: created.id,
      title: created.title,
      originalFilename: created.originalFilename,
      visibility: created.visibility,
      sortOrder: created.sortOrder,
      sizeBytes: created.sizeBytes,
      locale,
    });
  } catch (error) {
    if (storedBlobKey) {
      try {
        await deleteDocumentFile(storedBlobKey);
      } catch {
        // best-effort orphan cleanup
      }
    }
    if (error instanceof DocumentLimitError) {
      return NextResponse.json(
        { ok: false, error: "document_limit" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "create_failed" },
      { status: 500 },
    );
  }
}
