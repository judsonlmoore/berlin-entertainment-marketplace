import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import { getActorContext } from "@/src/db/queries/actor";
import {
  auditEvents,
  entertainerProfiles,
  riderFiles,
} from "@/src/db/schema/marketplace";
import { can } from "@/src/domain/permissions";
import {
  sanitizeRiderFilename,
  validateRiderUploadInput,
} from "@/src/domain/rider";
import { getFileStore, isFileStoreConfigured } from "@/src/integrations/files";

/**
 * Rider upload intent boundary. Does not stream bytes to public URLs.
 * Sandbox mode registers metadata keys only.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }
  if (!isFileStoreConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "blob_unconfigured",
        message:
          "Private Blob is not provisioned. Use FILE_STORE=sandbox for local metadata demos.",
      },
      { status: 503 },
    );
  }

  const actor = await getActorContext(session.user.id);
  if (!actor || !can(actor, "entertainer.manage_own_profile")) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }

  let body: {
    entertainerProfileId?: string;
    mimeType?: string;
    sizeBytes?: number;
    checksum?: string;
    originalFilename?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const check = validateRiderUploadInput({
    mimeType: body.mimeType ?? "",
    sizeBytes: Number(body.sizeBytes),
    checksum: body.checksum ?? "",
  });
  if (!check.ok || !body.entertainerProfileId) {
    return NextResponse.json(
      {
        ok: false,
        error: "validation",
        message: check.ok ? "profile required" : check.reason,
      },
      { status: 400 },
    );
  }

  const db = getDb();
  const profile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.id, body.entertainerProfileId),
  });
  if (!profile || profile.userId !== session.user.id) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }

  const store = getFileStore();
  const intent = await store.createUpload({
    ownerUserId: session.user.id,
    mimeType: body.mimeType!,
    sizeBytes: Number(body.sizeBytes),
    checksum: body.checksum!,
  });

  const [created] = await db
    .insert(riderFiles)
    .values({
      ownerUserId: session.user.id,
      entertainerProfileId: profile.id,
      blobKey: intent.key,
      originalFilename: body.originalFilename
        ? sanitizeRiderFilename(body.originalFilename)
        : null,
      mimeType: body.mimeType!,
      sizeBytes: Number(body.sizeBytes),
      checksum: body.checksum!.toLowerCase(),
      scanStatus: store.name === "sandbox" ? "awaiting_blob" : "pending",
    })
    .returning();

  await db.insert(auditEvents).values({
    actorUserId: session.user.id,
    action: "rider.upload_intent",
    subjectType: "rider_file",
    subjectId: created!.id,
    metadata: { store: store.name, key: intent.key },
  });

  return NextResponse.json({
    ok: true,
    id: created!.id,
    uploadUrl: intent.uploadUrl,
    key: intent.key,
    store: store.name,
  });
}
