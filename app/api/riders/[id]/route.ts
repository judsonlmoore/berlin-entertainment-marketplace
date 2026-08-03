import { NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { getActorContext } from "@/src/db/queries/actor";
import {
  canAccessRiderFile,
  getRiderFileForDownload,
} from "@/src/db/queries/rider-access";
import { getFileStore, isFileStoreConfigured } from "@/src/integrations/files";

type Props = { params: Promise<{ id: string }> };

/** Authorized rider download — short-lived read URL, never permanent public links. */
export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }
  if (!isFileStoreConfigured()) {
    return NextResponse.json(
      { ok: false, error: "blob_unconfigured" },
      { status: 503 },
    );
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const rider = await getRiderFileForDownload(id);
  if (!rider) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const allowed = await canAccessRiderFile({ actor, rider });
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }

  const store = getFileStore();
  const readUrl = await store.createAuthorizedReadUrl(rider.blobKey);
  const filename =
    rider.originalFilename?.trim() || `rider-${rider.id.slice(0, 8)}.pdf`;

  return NextResponse.redirect(readUrl, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
    },
  });
}
