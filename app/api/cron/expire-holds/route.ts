import { NextResponse } from "next/server";
import { expireStaleHolds } from "@/src/db/queries/calendar-ops";
import { getDb } from "@/src/db/client";
import { auditEvents } from "@/src/db/schema/marketplace";

/**
 * Idempotent hold-expiry reconciliation for Vercel Cron.
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

  const result = await expireStaleHolds();
  const db = getDb();
  await db.insert(auditEvents).values({
    actorUserId: null,
    action: "calendar.holds_expired",
    subjectType: "system",
    subjectId: "hold-expiry-cron",
    metadata: {
      expired: result.expired,
      checkedAt: result.checkedAt.toISOString(),
    },
  });

  return NextResponse.json({ ok: true, ...result });
}
