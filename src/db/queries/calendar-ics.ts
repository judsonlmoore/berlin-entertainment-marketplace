import { and, eq, gte, inArray, isNull, lt, ne } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  cachedExternalEvents,
  calendarEntries,
  calendarExportTokens,
  externalCalendarSubscriptions,
} from "@/src/db/schema/marketplace";
import type { CalendarOwnerType } from "@/src/domain/calendar";
import {
  decryptSecret,
  encryptSecret,
  deriveExportToken,
  hashToken,
} from "@/src/lib/calendar-secrets";
import { buildBookingExportIcs, fetchIcsBusyBlocks } from "@/src/lib/ics";
import { getAppOrigin } from "@/src/lib/seo-metadata";

export async function createExternalSubscription(input: {
  ownerType: CalendarOwnerType;
  ownerId: string;
  label: string;
  feedUrl: string;
  createdByUserId: string;
}) {
  const encrypted = encryptSecret(input.feedUrl);
  const db = getDb();
  const [created] = await db
    .insert(externalCalendarSubscriptions)
    .values({
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      label: input.label,
      feedUrlCiphertext: encrypted.ciphertext,
      feedUrlNonce: encrypted.nonce,
      createdByUserId: input.createdByUserId,
      status: "active",
    })
    .returning();
  return created;
}

export async function listExternalSubscriptions(input: {
  ownerType: CalendarOwnerType;
  ownerId: string;
}) {
  const db = getDb();
  return db
    .select({
      id: externalCalendarSubscriptions.id,
      label: externalCalendarSubscriptions.label,
      status: externalCalendarSubscriptions.status,
      lastRefreshedAt: externalCalendarSubscriptions.lastRefreshedAt,
      lastError: externalCalendarSubscriptions.lastError,
      createdAt: externalCalendarSubscriptions.createdAt,
    })
    .from(externalCalendarSubscriptions)
    .where(
      and(
        eq(externalCalendarSubscriptions.ownerType, input.ownerType),
        eq(externalCalendarSubscriptions.ownerId, input.ownerId),
      ),
    );
}

export async function refreshExternalSubscription(subscriptionId: string) {
  const db = getDb();
  const sub = await db.query.externalCalendarSubscriptions.findFirst({
    where: eq(externalCalendarSubscriptions.id, subscriptionId),
  });
  if (!sub) {
    throw new Error("Subscription not found");
  }

  try {
    const feedUrl = decryptSecret(sub.feedUrlCiphertext, sub.feedUrlNonce);
    const blocks = await fetchIcsBusyBlocks(feedUrl);

    await db.transaction(async (tx) => {
      await tx
        .delete(cachedExternalEvents)
        .where(eq(cachedExternalEvents.subscriptionId, subscriptionId));

      if (blocks.length > 0) {
        await tx.insert(cachedExternalEvents).values(
          blocks.map((block) => ({
            subscriptionId,
            externalUid: block.uid.slice(0, 500),
            startsAt: block.startsAt,
            endsAt: block.endsAt,
            allDay: block.allDay,
          })),
        );
      }

      await tx
        .update(externalCalendarSubscriptions)
        .set({
          lastRefreshedAt: new Date(),
          lastError: null,
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(externalCalendarSubscriptions.id, subscriptionId));
    });

    return { ok: true as const, count: blocks.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refresh failed";
    await db
      .update(externalCalendarSubscriptions)
      .set({
        lastError: message,
        status: "error",
        updatedAt: new Date(),
      })
      .where(eq(externalCalendarSubscriptions.id, subscriptionId));
    return { ok: false as const, error: message };
  }
}

export async function refreshAllActiveExternalSubscriptions() {
  const db = getDb();
  const subs = await db
    .select({ id: externalCalendarSubscriptions.id })
    .from(externalCalendarSubscriptions)
    .where(eq(externalCalendarSubscriptions.status, "active"));

  let refreshed = 0;
  let failed = 0;
  for (const sub of subs) {
    const result = await refreshExternalSubscription(sub.id);
    if (result.ok) refreshed += 1;
    else failed += 1;
  }
  return { refreshed, failed, total: subs.length };
}

export async function listCachedExternalBusyInRange(input: {
  ownerType: CalendarOwnerType;
  ownerId: string;
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const db = getDb();
  const subs = await db
    .select({ id: externalCalendarSubscriptions.id })
    .from(externalCalendarSubscriptions)
    .where(
      and(
        eq(externalCalendarSubscriptions.ownerType, input.ownerType),
        eq(externalCalendarSubscriptions.ownerId, input.ownerId),
        eq(externalCalendarSubscriptions.status, "active"),
      ),
    );

  if (subs.length === 0) return [];

  const rows = [];
  for (const sub of subs) {
    const events = await db
      .select()
      .from(cachedExternalEvents)
      .where(
        and(
          eq(cachedExternalEvents.subscriptionId, sub.id),
          lt(cachedExternalEvents.startsAt, input.rangeEnd),
          gte(cachedExternalEvents.endsAt, input.rangeStart),
        ),
      );
    rows.push(...events.map((e) => ({ ...e, subscriptionId: sub.id })));
  }
  return rows;
}

/**
 * One calendar resource → one stable subscribe URL.
 * Ensures a deterministic token row exists and revokes any other active tokens.
 */
export async function ensureCalendarSubscribeUrl(input: {
  ownerType: CalendarOwnerType;
  ownerId: string;
  createdByUserId: string;
}): Promise<string> {
  const rawToken = deriveExportToken(input.ownerType, input.ownerId);
  const tokenHash = hashToken(rawToken);
  const db = getDb();

  const existing = await db.query.calendarExportTokens.findFirst({
    where: and(
      eq(calendarExportTokens.tokenHash, tokenHash),
      isNull(calendarExportTokens.revokedAt),
    ),
  });

  if (!existing) {
    await db
      .update(calendarExportTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(calendarExportTokens.ownerType, input.ownerType),
          eq(calendarExportTokens.ownerId, input.ownerId),
          isNull(calendarExportTokens.revokedAt),
          ne(calendarExportTokens.tokenHash, tokenHash),
        ),
      );

    await db.insert(calendarExportTokens).values({
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      tokenHash,
      label: "subscribe",
      createdByUserId: input.createdByUserId,
    });
  }

  return `${getAppOrigin()}/api/calendar/ics/${rawToken}`;
}

export async function renderExportIcsForToken(rawToken: string) {
  const db = getDb();
  const token = await db.query.calendarExportTokens.findFirst({
    where: and(
      eq(calendarExportTokens.tokenHash, hashToken(rawToken)),
      isNull(calendarExportTokens.revokedAt),
    ),
  });
  if (!token) return null;

  await db
    .update(calendarExportTokens)
    .set({ lastAccessedAt: new Date() })
    .where(eq(calendarExportTokens.id, token.id));

  const exportable = await db
    .select()
    .from(calendarEntries)
    .where(
      and(
        eq(calendarEntries.ownerType, token.ownerType),
        eq(calendarEntries.ownerId, token.ownerId),
        inArray(calendarEntries.state, ["requested", "confirmed"]),
      ),
    );

  return buildBookingExportIcs({
    calendarName: "Salon bookings",
    events: exportable.map((entry) => ({
      uid: `${entry.id}@salon`,
      summary:
        entry.state === "confirmed" ? "Confirmed booking" : "Requested booking",
      startsAt: entry.startsAt,
      endsAt: entry.endsAt,
    })),
  });
}
