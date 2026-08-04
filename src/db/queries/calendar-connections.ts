import { and, eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { calendarConnections } from "@/src/db/schema/marketplace";
import type { CalendarOwnerType } from "@/src/domain/calendar";

export async function listCalendarConnections(input: {
  ownerType: CalendarOwnerType;
  ownerId: string;
}) {
  const db = getDb();
  return db
    .select()
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.ownerType, input.ownerType),
        eq(calendarConnections.ownerId, input.ownerId),
      ),
    );
}

export async function upsertCalendarConnection(input: {
  ownerType: CalendarOwnerType;
  ownerId: string;
  provider: string;
  status?: string;
  externalAccountLabel?: string | null;
}) {
  const db = getDb();
  const existing = await db.query.calendarConnections.findFirst({
    where: and(
      eq(calendarConnections.ownerType, input.ownerType),
      eq(calendarConnections.ownerId, input.ownerId),
      eq(calendarConnections.provider, input.provider),
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(calendarConnections)
      .set({
        status: input.status ?? existing.status,
        externalAccountLabel:
          input.externalAccountLabel === undefined
            ? existing.externalAccountLabel
            : input.externalAccountLabel,
        updatedAt: new Date(),
      })
      .where(eq(calendarConnections.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(calendarConnections)
    .values({
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      provider: input.provider,
      status: input.status ?? "disconnected",
      externalAccountLabel: input.externalAccountLabel ?? null,
    })
    .returning();
  return created;
}
