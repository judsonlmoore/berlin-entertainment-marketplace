import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/src/auth";
import { getActorContext } from "@/src/db/queries/actor";
import { getDb } from "@/src/db/client";
import {
  entertainerProfiles,
  portfolioItems,
} from "@/src/db/schema/marketplace";
import { can } from "@/src/domain/permissions";
import { getFileStore, isFileStoreConfigured } from "@/src/integrations/files";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const item = await db.query.portfolioItems.findFirst({
    where: eq(portfolioItems.id, id),
  });
  if (!item || item.kind !== "image" || !item.blobKey) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const profile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.id, item.entertainerProfileId),
  });
  if (!profile) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const isOwner = profile.userId === session.user.id;
  if (!isOwner && !can(actor, "discover.entertainers")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  if (!isFileStoreConfigured()) {
    return NextResponse.json(
      { ok: false, error: "blob_unconfigured" },
      { status: 503 },
    );
  }

  const store = getFileStore();
  const readUrl = await store.createAuthorizedReadUrl(item.blobKey);
  return NextResponse.redirect(readUrl, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
