import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import {
  auditEvents,
  entertainerProfiles,
  portfolioItems,
} from "@/src/db/schema/marketplace";
import { can } from "@/src/domain/permissions";
import {
  PORTFOLIO_MAX_IMAGES,
  validatePortfolioImageInput,
} from "@/src/domain/portfolio";
import {
  deletePortfolioImage,
  savePortfolioImage,
} from "@/src/integrations/portfolio-image-store";
import { resolveEffectiveActor } from "@/src/lib/effective-actor";
import { and, count, eq, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";

type PortfolioOwner =
  | {
      kind: "entertainer";
      ownerUserId: string;
      ownerFilter: SQL;
      insert: { entertainerProfileId: string };
    }
  | {
      kind: "venue";
      ownerUserId: string;
      ownerFilter: SQL;
      insert: { venueId: string };
    };

export async function POST(request: Request) {
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
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }
  const { actor, auditUserId } = resolved;

  const form = await request.formData();
  const entertainerProfileIdRaw = String(
    form.get("entertainerProfileId") ?? "",
  ).trim();
  const venueIdRaw = String(form.get("venueId") ?? "").trim();
  const caption = String(form.get("caption") ?? "").trim();
  const altText = String(form.get("altText") ?? "").trim();
  const file = form.get("file");

  const hasProfile = Boolean(entertainerProfileIdRaw);
  const hasVenue = Boolean(venueIdRaw);
  if (hasProfile === hasVenue) {
    return NextResponse.json(
      { ok: false, error: "owner_required" },
      { status: 400 },
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { ok: false, error: "file_required" },
      { status: 400 },
    );
  }

  const check = validatePortfolioImageInput({
    mimeType: file.type,
    sizeBytes: file.size,
    ...(caption ? { caption } : {}),
    ...(altText ? { altText } : {}),
  });
  if (!check.ok) {
    return NextResponse.json(
      { ok: false, error: check.reason },
      { status: 400 },
    );
  }

  const db = getDb();
  let owner: PortfolioOwner;

  if (hasProfile) {
    if (!can(actor, "entertainer.manage_own_profile")) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 },
      );
    }
    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.id, entertainerProfileIdRaw),
    });
    if (!profile || profile.userId !== actor.userId) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 },
      );
    }
    owner = {
      kind: "entertainer",
      ownerUserId: profile.userId,
      ownerFilter: eq(portfolioItems.entertainerProfileId, profile.id),
      insert: { entertainerProfileId: profile.id },
    };
  } else {
    if (!can(actor, "venue.manage", { venueId: venueIdRaw })) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 },
      );
    }
    owner = {
      kind: "venue",
      ownerUserId: actor.userId,
      ownerFilter: eq(portfolioItems.venueId, venueIdRaw),
      insert: { venueId: venueIdRaw },
    };
  }

  const [imageCount] = await db
    .select({ value: count() })
    .from(portfolioItems)
    .where(and(owner.ownerFilter, eq(portfolioItems.kind, "image")));
  if ((imageCount?.value ?? 0) >= PORTFOLIO_MAX_IMAGES) {
    return NextResponse.json(
      { ok: false, error: "image_limit" },
      { status: 400 },
    );
  }

  const [row] = await db
    .select({ value: count() })
    .from(portfolioItems)
    .where(owner.ownerFilter);
  const sortOrder = row?.value ?? 0;

  const bytes = new Uint8Array(await file.arrayBuffer());
  let blobKey: string | null = null;
  let thumbBlobKey: string | null = null;
  try {
    ({ blobKey } = await savePortfolioImage({
      ownerUserId: owner.ownerUserId,
      mimeType: file.type,
      bytes,
    }));
    try {
      const { createPortfolioThumbBytes } =
        await import("@/src/integrations/portfolio-image-thumb");
      const thumbBytes = await createPortfolioThumbBytes(bytes);
      ({ blobKey: thumbBlobKey } = await savePortfolioImage({
        ownerUserId: owner.ownerUserId,
        mimeType: "image/webp",
        bytes: thumbBytes,
        filenameSuffix: "-thumb",
      }));
    } catch {
      // Thumb is best-effort; full image remains usable via ?v=thumb fallback.
      thumbBlobKey = null;
    }

    const [created] = await db
      .insert(portfolioItems)
      .values({
        ...owner.insert,
        kind: "image",
        blobKey,
        thumbBlobKey,
        caption: caption || null,
        altText: altText || null,
        sortOrder,
      })
      .returning();

    if (!created) {
      throw new Error("create_failed");
    }

    await db.insert(auditEvents).values({
      actorUserId: auditUserId,
      action: "portfolio.image_uploaded",
      subjectType: "portfolio_item",
      subjectId: created.id,
      metadata: {
        kind: "image",
        mimeType: file.type,
        sizeBytes: file.size,
        hasThumb: Boolean(thumbBlobKey),
      },
    });

    return NextResponse.json({
      ok: true,
      id: created.id,
      blobKey,
      thumbBlobKey,
    });
  } catch (error) {
    if (blobKey) {
      try {
        await deletePortfolioImage(blobKey);
      } catch {
        // best-effort orphan cleanup
      }
    }
    if (thumbBlobKey) {
      try {
        await deletePortfolioImage(thumbBlobKey);
      } catch {
        // best-effort orphan cleanup
      }
    }
    // Blob saved but DB write failed → create_failed; otherwise storage failure.
    if (blobKey) {
      return NextResponse.json(
        { ok: false, error: "create_failed" },
        { status: 500 },
      );
    }
    const message =
      error instanceof Error ? error.message : "storage_unavailable";
    return NextResponse.json(
      { ok: false, error: "storage_unavailable", message },
      { status: 503 },
    );
  }
}
