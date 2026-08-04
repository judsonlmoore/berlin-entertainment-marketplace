import { NextResponse } from "next/server";
import { refreshAllActiveExternalSubscriptions } from "@/src/db/queries/calendar-ics";
import { getDb } from "@/src/db/client";
import { auditEvents } from "@/src/db/schema/marketplace";

/**
 * Refresh active external ICS feed subscriptions.
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

  const result = await refreshAllActiveExternalSubscriptions();
  const db = getDb();
  await db.insert(auditEvents).values({
    actorUserId: null,
    action: "system.ics_refresh_run",
    subjectType: "system",
    subjectId: "ics-refresh-cron",
    metadata: { ...result, checkedAt: new Date().toISOString() },
  });

  return NextResponse.json({ ok: true, ...result });
}
