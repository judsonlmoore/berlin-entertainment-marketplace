import { and, eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { calendarConnections } from "@/src/db/schema/marketplace";
import type {
  CalendarOwnerType,
  CalendarSyncProviderName,
} from "@/src/integrations/calendar-sync";

export async function listCalendarConnections(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(calendarConnections)
    .where(eq(calendarConnections.userId, userId));
}

export async function getCalendarConnection(input: {
  ownerType: CalendarOwnerType;
  ownerId: string;
  provider: CalendarSyncProviderName;
}) {
  const db = getDb();
  return db.query.calendarConnections.findFirst({
    where: and(
      eq(calendarConnections.ownerType, input.ownerType),
      eq(calendarConnections.ownerId, input.ownerId),
      eq(calendarConnections.provider, input.provider),
    ),
  });
}

export async function upsertCalendarConnection(input: {
  userId: string;
  ownerType: CalendarOwnerType;
  ownerId: string;
  provider: CalendarSyncProviderName;
  status?: "disconnected" | "connected" | "error";
  externalAccountLabel?: string | null;
  lastSyncAt?: Date | null;
  lastError?: string | null;
}) {
  const db = getDb();
  const existing = await getCalendarConnection({
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    provider: input.provider,
  });

  if (existing) {
    const [updated] = await db
      .update(calendarConnections)
      .set({
        status: input.status ?? existing.status,
        externalAccountLabel:
          input.externalAccountLabel ?? existing.externalAccountLabel,
        lastSyncAt: input.lastSyncAt ?? existing.lastSyncAt,
        lastError: input.lastError ?? existing.lastError,
        updatedAt: new Date(),
      })
      .where(eq(calendarConnections.id, existing.id))
      .returning();
    return updated ?? existing;
  }

  const [created] = await db
    .insert(calendarConnections)
    .values({
      userId: input.userId,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      provider: input.provider,
      status: input.status ?? "disconnected",
      externalAccountLabel: input.externalAccountLabel ?? null,
      lastSyncAt: input.lastSyncAt ?? null,
      lastError: input.lastError ?? null,
    })
    .returning();
  return created ?? null;
}
