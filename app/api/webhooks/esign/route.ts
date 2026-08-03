import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { agreements, auditEvents } from "@/src/db/schema/marketplace";
import { getESignProvider } from "@/src/integrations/esign";

/**
 * E-signature webhook boundary. Verifies provider signature, records an audit
 * event, and leaves local booking state authoritative after verified events.
 * Sandbox/local signing still goes through Server Actions.
 */
export async function POST(request: Request) {
  const provider = getESignProvider();
  if (provider.name === "unconfigured") {
    return NextResponse.json(
      { ok: false, error: "esign_unconfigured" },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signatureHeader =
    request.headers.get("x-esign-signature") ??
    request.headers.get("x-salon-esign-signature");

  let event;
  try {
    event = await provider.verifyWebhook(rawBody, signatureHeader);
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_webhook" },
      { status: 401 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, error: "database_unconfigured" },
      { status: 503 },
    );
  }

  const db = getDb();
  const agreement = await db.query.agreements.findFirst({
    where: eq(agreements.providerEnvelopeId, event.providerEnvelopeId),
  });

  await db.insert(auditEvents).values({
    actorUserId: null,
    action: "esign.webhook_received",
    subjectType: agreement ? "agreement" : "esign_envelope",
    subjectId: agreement?.id ?? event.providerEnvelopeId,
    metadata: {
      type: event.type,
      eventHash: event.eventHash,
      providerEnvelopeId: event.providerEnvelopeId,
      bookingId: agreement?.bookingId ?? null,
      note: "Webhook recorded; apply signature transitions via reconciled local state",
    },
  });

  return NextResponse.json({ ok: true, received: true });
}
