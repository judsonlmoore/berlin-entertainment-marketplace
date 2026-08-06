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
  validateProfileDocumentUpload,
} from "@/src/domain/profile-document";
import { sanitizeRiderFilename } from "@/src/domain/rider";
import {
  isDocumentStoreConfigured,
  saveDocumentFile,
} from "@/src/integrations/document-file-store";
import { resolveEffectiveActor } from "@/src/lib/effective-actor";
import { asc, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

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

  const [docCount] = await db
    .select({ value: count() })
    .from(riderFiles)
    .where(eq(riderFiles.entertainerProfileId, profile.id));
  if ((docCount?.value ?? 0) >= PROFILE_DOCUMENT_MAX) {
    return NextResponse.json(
      { ok: false, error: "document_limit" },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = file.type || "application/pdf";
  const stored = await saveDocumentFile({
    ownerUserId: actor.userId,
    mimeType,
    bytes,
  });

  const existing = await db
    .select({ sortOrder: riderFiles.sortOrder })
    .from(riderFiles)
    .where(eq(riderFiles.entertainerProfileId, profile.id))
    .orderBy(asc(riderFiles.sortOrder));
  const nextSort =
    existing.length > 0
      ? (existing[existing.length - 1]?.sortOrder ?? 0) + 1
      : 0;

  const [created] = await db
    .insert(riderFiles)
    .values({
      ownerUserId: actor.userId,
      entertainerProfileId: profile.id,
      blobKey: stored.blobKey,
      title: check.title,
      visibility: check.visibility,
      sortOrder: nextSort,
      originalFilename,
      mimeType,
      sizeBytes: file.size,
      checksum: "0".repeat(64),
      scanStatus: "clean",
    })
    .returning();

  if (!created) {
    return NextResponse.json(
      { ok: false, error: "create_failed" },
      { status: 500 },
    );
  }

  await db.insert(auditEvents).values({
    actorUserId: auditUserId,
    action: "profile_document.uploaded",
    subjectType: "rider_file",
    subjectId: created.id,
    metadata: {
      title: created.title,
      visibility: created.visibility,
      sizeBytes: created.sizeBytes,
    },
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
}
