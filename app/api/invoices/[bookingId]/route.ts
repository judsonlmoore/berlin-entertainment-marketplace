import { auth } from "@/src/auth";
import { getBookingDetail } from "@/src/db/queries/bookings";
import { loadDocumentFile } from "@/src/integrations/document-file-store";
import { resolveEffectiveActor } from "@/src/lib/effective-actor";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ bookingId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { bookingId } = await params;
  const resolved = await resolveEffectiveActor(session.user.id);
  if (!resolved) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const detail = await getBookingDetail(bookingId);
  if (!detail?.invoice?.blobKey) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const { actor } = resolved;
  const isEntertainer = detail.booking.entertainerUserId === actor.userId;
  const isVenue = actor.venueId === detail.booking.venueId;
  if (!isEntertainer && !isVenue && !actor.isPlatformStaff) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const file = await loadDocumentFile(detail.invoice.blobKey);
  if (!file) {
    return NextResponse.json({ ok: false, error: "missing_blob" }, { status: 404 });
  }

  const filename = `salon-invoice-${bookingId.slice(0, 8)}.txt`;
  return new NextResponse(Buffer.from(file.bytes), {
    status: 200,
    headers: {
      "Content-Type": file.mimeType || "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
