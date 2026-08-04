import { NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import { getActorContext } from "@/src/db/queries/actor";
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
import { putPortfolioImageBytes } from "@/src/integrations/portfolio-image-memory";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const actor = await getActorContext(session.user.id);
  if (!actor || !can(actor, "entertainer.manage_own_profile")) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }

  const form = await request.formData();
  const entertainerProfileId = String(form.get("entertainerProfileId") ?? "");
  const caption = String(form.get("caption") ?? "").trim();
  const altText = String(form.get("altText") ?? "").trim();
  const file = form.get("file");

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
  if (!profile || profile.userId !== session.user.id) {
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
  const blobKey = `memory/${session.user.id}/portfolio/${crypto.randomUUID()}`;
  putPortfolioImageBytes(blobKey, file.type, bytes);

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
    actorUserId: session.user.id,
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
