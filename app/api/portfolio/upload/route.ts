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
import { savePortfolioImage } from "@/src/integrations/portfolio-image-store";
import { resolveEffectiveActor } from "@/src/lib/effective-actor";
import { and, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

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
  const entertainerProfileId = String(form.get("entertainerProfileId") ?? "");
  const caption = String(form.get("caption") ?? "").trim();
  const altText = String(form.get("altText") ?? "").trim();
  const file = form.get("file");

  if (!can(actor, "entertainer.manage_own_profile")) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
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
  const profile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.id, entertainerProfileId),
  });
  if (!profile || profile.userId !== actor.userId) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }

  const [imageCount] = await db
    .select({ value: count() })
    .from(portfolioItems)
    .where(
      and(
        eq(portfolioItems.entertainerProfileId, profile.id),
        eq(portfolioItems.kind, "image"),
      ),
    );
  if ((imageCount?.value ?? 0) >= PORTFOLIO_MAX_IMAGES) {
    return NextResponse.json(
      { ok: false, error: "image_limit" },
      { status: 400 },
    );
  }

  const [row] = await db
    .select({ value: count() })
    .from(portfolioItems)
    .where(eq(portfolioItems.entertainerProfileId, profile.id));
  const sortOrder = row?.value ?? 0;

  const bytes = new Uint8Array(await file.arrayBuffer());
  let blobKey: string;
  try {
    ({ blobKey } = await savePortfolioImage({
      ownerUserId: profile.userId,
      mimeType: file.type,
      bytes,
    }));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "storage_unavailable";
    return NextResponse.json(
      { ok: false, error: "storage_unavailable", message },
      { status: 503 },
    );
  }

  const [created] = await db
    .insert(portfolioItems)
    .values({
      entertainerProfileId: profile.id,
      kind: "image",
      blobKey,
      caption: caption || null,
      altText: altText || null,
      sortOrder,
    })
    .returning();

  await db.insert(auditEvents).values({
    actorUserId: auditUserId,
    action: "portfolio.image_uploaded",
    subjectType: "portfolio_item",
    subjectId: created!.id,
    metadata: {
      kind: "image",
      mimeType: file.type,
      sizeBytes: file.size,
    },
  });

  return NextResponse.json({
    ok: true,
    id: created!.id,
    blobKey,
  });
}
