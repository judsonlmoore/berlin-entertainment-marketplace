import { NextResponse } from "next/server";
import { expireStaleHolds } from "@/src/db/queries/calendar-ops";
import { expireOverdueDirectRequests } from "@/src/db/queries/direct-requests";
import { expireStaleProfileOffers } from "@/src/db/queries/profile-enquiries";
import { getDb } from "@/src/db/client";
import { auditEvents } from "@/src/db/schema/marketplace";

/**
 * Idempotent hold, direct-request, and profile-offer expiry for Vercel Cron.
 * Authorize with Authorization: Bearer $CRON_SECRET.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "cron_unconfigured" },
      { status: 503 },
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, error: "database_unconfigured" },
      { status: 503 },
    );
  }

  const holdResult = await expireStaleHolds();
  const requestResult = await expireOverdueDirectRequests();
  const offerResult = await expireStaleProfileOffers();
  const db = getDb();
  await db.insert(auditEvents).values({
    actorUserId: null,
    action: "system.reconciliation_run",
    subjectType: "system",
    subjectId: "hold-expiry-cron",
    metadata: {
      expiredHolds: holdResult.expired,
      expiredRequests: requestResult.expired,
      expiredProfileOffers: offerResult.expired,
      checkedAt: holdResult.checkedAt.toISOString(),
    },
  });

  return NextResponse.json({
    ok: true,
    expiredHolds: holdResult.expired,
    expiredRequests: requestResult.expired,
    expiredProfileOffers: offerResult.expired,
    checkedAt: holdResult.checkedAt,
  });
}
