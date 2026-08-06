import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import {
  entertainerProfiles,
  portfolioItems,
  venues,
} from "@/src/db/schema/marketplace";
import { can } from "@/src/domain/permissions";
import { getFileStore, isFileStoreConfigured } from "@/src/integrations/files";
import {
  isBlobPortfolioKey,
  isLocalPortfolioKey,
  loadPortfolioImage,
} from "@/src/integrations/portfolio-image-store";
import { resolveEffectiveActor } from "@/src/lib/effective-actor";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Props) {
  const { id } = await params;
  const wantThumb = new URL(request.url).searchParams.get("v") === "thumb";
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
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

  const db = getDb();
  const item = await db.query.portfolioItems.findFirst({
    where: eq(portfolioItems.id, id),
  });
  if (!item || item.kind !== "image" || !item.blobKey) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  let isOwner = false;
  let isPublished = false;

  if (item.entertainerProfileId) {
    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.id, item.entertainerProfileId),
    });
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 },
      );
    }
    isOwner = profile.userId === actor.userId;
    isPublished = profile.publicationState === "approved";
    if (!isOwner) {
      if (!can(actor, "discover.entertainers")) {
        return NextResponse.json(
          { ok: false, error: "forbidden" },
          { status: 403 },
        );
      }
      if (!isPublished) {
        return NextResponse.json(
          { ok: false, error: "not_found" },
          { status: 404 },
        );
      }
    }
  } else if (item.venueId) {
    const venue = await db.query.venues.findFirst({
      where: eq(venues.id, item.venueId),
      columns: {
        id: true,
        ownerUserId: true,
        publicationState: true,
      },
    });
    if (!venue) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 },
      );
    }
    isOwner =
      venue.ownerUserId === actor.userId ||
      can(actor, "venue.manage", { venueId: venue.id });
    isPublished = venue.publicationState === "approved";
    if (!isOwner) {
      if (!can(actor, "discover.venues")) {
        return NextResponse.json(
          { ok: false, error: "forbidden" },
          { status: 403 },
        );
      }
      if (!isPublished) {
        return NextResponse.json(
          { ok: false, error: "not_found" },
          { status: 404 },
        );
      }
    }
  } else {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const key = wantThumb && item.thumbBlobKey ? item.thumbBlobKey : item.blobKey;

  // Local disk + Vercel Blob keys are both served through our auth proxy.
  if (isLocalPortfolioKey(key) || isBlobPortfolioKey(key)) {
    const stored = await loadPortfolioImage(key);
    if (!stored) {
      // Thumb missing/corrupt → fall back to full original once.
      if (wantThumb && item.thumbBlobKey && key === item.thumbBlobKey) {
        const full = await loadPortfolioImage(item.blobKey);
        if (full) {
          return new NextResponse(Buffer.from(full.bytes), {
            headers: {
              "Content-Type": full.mimeType,
              "Cache-Control": "private, max-age=3600",
            },
          });
        }
      }
      return NextResponse.json(
        {
          ok: false,
          error: isBlobPortfolioKey(key) ? "blob_fetch_failed" : "not_found",
        },
        { status: 404 },
      );
    }
    return new NextResponse(Buffer.from(stored.bytes), {
      headers: {
        "Content-Type": stored.mimeType,
        "Cache-Control": wantThumb
          ? "private, max-age=3600"
          : "private, no-store",
      },
    });
  }

  // Legacy pending/* rows registered without storing bytes.
  if (item.blobKey.startsWith("pending/")) {
    return NextResponse.json(
      {
        ok: false,
        error: "bytes_missing",
        message: "Re-upload this image — bytes were never stored.",
      },
      { status: 404 },
    );
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
