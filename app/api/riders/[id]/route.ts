import { NextResponse } from "next/server";
import { auth } from "@/src/auth";
import {
  canAccessRiderFile,
  getRiderFileForDownload,
} from "@/src/db/queries/rider-access";
import { hasMarketplaceAccess } from "@/src/domain/approval";
import {
  isDocumentStoreConfigured,
  loadDocumentFile,
} from "@/src/integrations/document-file-store";
import { resolveEffectiveActor } from "@/src/lib/effective-actor";

type Props = { params: Promise<{ id: string }> };

const DOWNLOADABLE_SCAN_STATES = new Set(["clean", "awaiting_blob", "pending"]);

/** Authorized document download — streams private bytes; never permanent public URLs. */
export async function GET(request: Request, { params }: Props) {
  const { id } = await params;
  const inline = new URL(request.url).searchParams.get("inline") === "1";
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }
  if (!isDocumentStoreConfigured()) {
    return NextResponse.json(
      { ok: false, error: "blob_unconfigured" },
      { status: 503 },
    );
  }

  const resolved = await resolveEffectiveActor(session.user.id);
  if (!resolved) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }
  const { actor } = resolved;

  if (
    !actor.isPlatformStaff &&
    (actor.accountStatus === null || !hasMarketplaceAccess(actor.accountStatus))
  ) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }

  const rider = await getRiderFileForDownload(id);
  if (!rider) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const isOwner = rider.ownerUserId === actor.userId;
  if (
    !actor.isPlatformStaff &&
    !isOwner &&
    !DOWNLOADABLE_SCAN_STATES.has(rider.scanStatus)
  ) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }
  if (!actor.isPlatformStaff && isOwner && rider.scanStatus === "quarantined") {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }

  const allowed = await canAccessRiderFile({ actor, rider });
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }

  const loaded = await loadDocumentFile(rider.blobKey);
  if (!loaded) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const filename =
    rider.title?.trim() ||
    rider.originalFilename?.trim() ||
    `document-${rider.id.slice(0, 8)}.pdf`;
  const safeName = filename.replace(/"/g, "").endsWith(".pdf")
    ? filename.replace(/"/g, "")
    : `${filename.replace(/"/g, "")}.pdf`;

  return new NextResponse(Buffer.from(loaded.bytes), {
    status: 200,
    headers: {
      "Content-Type": loaded.mimeType || "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "Content-Length": String(loaded.bytes.byteLength),
    },
  });
}
