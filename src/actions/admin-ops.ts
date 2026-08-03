"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/src/auth";
import { expireStaleHolds } from "@/src/db/queries/calendar-ops";
import { getActorContext } from "@/src/db/queries/actor";
import { AppError } from "@/src/domain/errors";
import { can } from "@/src/domain/permissions";
import { getDb } from "@/src/db/client";
import { auditEvents } from "@/src/db/schema/marketplace";

export type ActionResult =
  { ok: true; expired?: number } | { ok: false; code: string; message: string };

const expireSchema = z.object({
  locale: z.enum(["en", "de"]).default("en"),
});

export async function runHoldExpiry(
  input: z.infer<typeof expireSchema> = { locale: "en" },
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new AppError("unauthorized", "Sign in required");
    }
    const actor = await getActorContext(session.user.id);
    if (!actor || !can(actor, "admin.operations")) {
      throw new AppError("forbidden", "Staff only");
    }

    const parsed = expireSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid expiry request");
    }

    const result = await expireStaleHolds({ actorUserId: session.user.id });
    const db = getDb();
    await db.insert(auditEvents).values({
      actorUserId: session.user.id,
      action: "calendar.holds_expired",
      subjectType: "system",
      subjectId: "hold-expiry",
      metadata: {
        expired: result.expired,
        checkedAt: result.checkedAt.toISOString(),
      },
    });

    revalidatePath(`/${parsed.data.locale}/admin`);
    revalidatePath(`/${parsed.data.locale}/marketplace/calendar`);
    return { ok: true, expired: result.expired };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, code: error.code, message: error.message };
    }
    throw error;
  }
}
