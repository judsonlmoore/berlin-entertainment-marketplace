import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import {
  agreements,
  bookings,
  entertainerProfiles,
} from "@/src/db/schema/marketplace";
import { hasMarketplaceAccess } from "@/src/domain/approval";
import { isBookingArtifactParty } from "@/src/domain/agreement";
import {
  isDocumentStoreConfigured,
  loadDocumentFile,
} from "@/src/integrations/document-file-store";
import { resolveEffectiveActor } from "@/src/lib/effective-actor";

type Props = { params: Promise<{ id: string }> };

/** Authorized agreement package PDF download — parties and staff only. */
export async function GET(_request: Request, { params }: Props) {
  const { id: agreementId } = await params;
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

  const db = getDb();
  const agreement = await db.query.agreements.findFirst({
    where: eq(agreements.id, agreementId),
  });
  if (!agreement?.packagePdfBlobKey) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, agreement.bookingId),
    columns: {
      id: true,
      venueId: true,
      entertainerProfileId: true,
    },
  });
  if (!booking) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const profile = actor.roles.includes("entertainer")
    ? await db.query.entertainerProfiles.findFirst({
        where: eq(entertainerProfiles.userId, actor.userId),
        columns: { id: true },
      })
    : null;

  const isParty = isBookingArtifactParty({
    isPlatformStaff: actor.isPlatformStaff,
    actorVenueId: actor.venueId,
    actorEntertainerProfileId: profile?.id ?? null,
    bookingVenueId: booking.venueId,
    bookingEntertainerProfileId: booking.entertainerProfileId,
  });

  if (!isParty) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }

  const loaded = await loadDocumentFile(agreement.packagePdfBlobKey);
  if (!loaded) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const filename = `agreement-${agreement.id.slice(0, 8)}.pdf`;
  return new NextResponse(Buffer.from(loaded.bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      ...(agreement.packageFingerprint
        ? { "X-Package-Fingerprint": agreement.packageFingerprint }
        : {}),
    },
  });
}
