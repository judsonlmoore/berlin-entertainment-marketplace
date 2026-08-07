import { auth } from "@/src/auth";
import { getBookingDetail } from "@/src/db/queries/bookings";
import { isBookingArtifactParty } from "@/src/domain/agreement";
import { hasMarketplaceAccess } from "@/src/domain/approval";
import { loadDocumentFile } from "@/src/integrations/document-file-store";
import { resolveEffectiveActor } from "@/src/lib/effective-actor";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ bookingId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const { bookingId } = await params;
  const resolved = await resolveEffectiveActor(session.user.id);
  if (!resolved) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
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

  const detail = await getBookingDetail(bookingId);
  if (!detail?.invoice?.blobKey) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const isParty = isBookingArtifactParty({
    isPlatformStaff: actor.isPlatformStaff,
    actorVenueId: actor.venueId,
    actorUserId: actor.userId,
    bookingVenueId: detail.booking.venueId,
    bookingEntertainerUserId: detail.booking.entertainerUserId,
  });
  if (!isParty) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }

  const file = await loadDocumentFile(detail.invoice.blobKey);
  if (!file) {
    return NextResponse.json(
      { ok: false, error: "missing_blob" },
      { status: 404 },
    );
  }

  const isPdf =
    detail.invoice.format === "sandbox_pdf" ||
    (file.mimeType?.includes("pdf") ?? false);
  const filename = `salon-invoice-${bookingId.slice(0, 8)}.${isPdf ? "pdf" : "txt"}`;
  return new NextResponse(Buffer.from(file.bytes), {
    status: 200,
    headers: {
      "Content-Type":
        file.mimeType ||
        (isPdf ? "application/pdf" : "text/plain; charset=utf-8"),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
