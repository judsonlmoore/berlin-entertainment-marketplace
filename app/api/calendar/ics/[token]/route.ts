import { NextResponse } from "next/server";
import { renderExportIcsForToken } from "@/src/db/queries/calendar-ics";

type Props = {
  params: Promise<{ token: string }>;
};

/**
 * Public ICS subscription feed for requested and confirmed bookings.
 * Token must be active (not revoked). No contact/deposit/private data.
 */
export async function GET(_request: Request, { params }: Props) {
  const { token } = await params;
  if (!token || token.length < 16) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!process.env.DATABASE_URL) {
    return new NextResponse("Service unavailable", { status: 503 });
  }

  const ics = await renderExportIcsForToken(token);
  if (!ics) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Disposition": 'inline; filename="salon-calendar.ics"',
    },
  });
}
