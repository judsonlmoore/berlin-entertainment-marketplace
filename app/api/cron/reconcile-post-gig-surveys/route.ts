import { NextResponse } from "next/server";
import { reconcilePostGigSurveyInvitations } from "@/src/db/queries/post-gig-surveys";
import { getDb } from "@/src/db/client";

/**
 * Idempotent post-gig survey reconciliation for Vercel Cron.
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

  // Smoke the DB connection early so cron failures are obvious.
  getDb();

  const result = await reconcilePostGigSurveyInvitations();

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
