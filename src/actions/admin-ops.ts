"use server";

import { type ActionResult, toActionError } from "@/src/actions/_shared";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/src/auth";
import { expireStaleHolds } from "@/src/db/queries/calendar-ops";
import { expireOverdueDirectRequests } from "@/src/db/queries/direct-requests";
import { getActorContext } from "@/src/db/queries/actor";
import { AppError } from "@/src/domain/errors";
import { can } from "@/src/domain/permissions";
import {
  canStaffModerateOpportunity,
  type OpportunityState,
} from "@/src/domain/opportunity";
import { getDb } from "@/src/db/client";
import {
  auditEvents,
  opportunities,
  riderFiles,
} from "@/src/db/schema/marketplace";

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

    const holdResult = await expireStaleHolds({ actorUserId: session.user.id });
    const requestResult = await expireOverdueDirectRequests({
      actorUserId: session.user.id,
    });
    const expired = holdResult.expired + requestResult.expired;

    const db = getDb();
    await db.insert(auditEvents).values({
      actorUserId: session.user.id,
      action: "system.reconciliation_run",
      subjectType: "system",
      subjectId: "reconciliation",
      metadata: {
        expiredHolds: holdResult.expired,
        expiredRequests: requestResult.expired,
        checkedAt: holdResult.checkedAt.toISOString(),
      },
    });

    revalidatePath(`/${parsed.data.locale}/admin`);
    revalidatePath(`/${parsed.data.locale}/marketplace/calendar`);
    revalidatePath(`/${parsed.data.locale}/marketplace/bookings`);
    return {
      ok: true,
      expired,
      expiredHolds: holdResult.expired,
      expiredRequests: requestResult.expired,
    };
  } catch (error) {
    return toActionError(error);
  }
}

const moderateOpportunitySchema = z.object({
  opportunityId: z.string().uuid(),
  nextState: z.enum(["closed", "cancelled"]),
  reason: z.string().trim().min(1).max(1000),
  locale: z.enum(["en", "de"]).default("en"),
});

export async function moderateOpportunity(
  input: z.infer<typeof moderateOpportunitySchema>,
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

    const parsed = moderateOpportunitySchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid moderation request");
    }

    const db = getDb();
    const opportunity = await db.query.opportunities.findFirst({
      where: eq(opportunities.id, parsed.data.opportunityId),
    });
    if (!opportunity) {
      throw new AppError("not_found", "Opportunity not found");
    }

    const from = opportunity.state as OpportunityState;
    if (!canStaffModerateOpportunity(from, parsed.data.nextState)) {
      throw new AppError(
        "invalid_transition",
        `Staff cannot move opportunity from ${from} to ${parsed.data.nextState}`,
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(opportunities)
        .set({ state: parsed.data.nextState, updatedAt: new Date() })
        .where(eq(opportunities.id, opportunity.id));
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "opportunity.moderated",
        subjectType: "opportunity",
        subjectId: opportunity.id,
        metadata: {
          from,
          to: parsed.data.nextState,
          reason: parsed.data.reason,
        },
      });
    });

    revalidatePath(`/${parsed.data.locale}/admin`);
    revalidatePath(`/${parsed.data.locale}/marketplace/opportunities`);
    revalidatePath(
      `/${parsed.data.locale}/marketplace/opportunities/${opportunity.id}`,
    );
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

const quarantineRiderSchema = z.object({
  riderFileId: z.string().uuid(),
  reason: z.string().trim().min(1).max(1000),
  locale: z.enum(["en", "de"]).default("en"),
});

export async function quarantineRiderFile(
  input: z.infer<typeof quarantineRiderSchema>,
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

    const parsed = quarantineRiderSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid quarantine request");
    }

    const db = getDb();
    const rider = await db.query.riderFiles.findFirst({
      where: eq(riderFiles.id, parsed.data.riderFileId),
    });
    if (!rider) {
      throw new AppError("not_found", "Rider file not found");
    }

    await db.transaction(async (tx) => {
      await tx
        .update(riderFiles)
        .set({ scanStatus: "quarantined" })
        .where(eq(riderFiles.id, rider.id));
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "rider.quarantined",
        subjectType: "rider_file",
        subjectId: rider.id,
        metadata: {
          previousScanStatus: rider.scanStatus,
          reason: parsed.data.reason,
        },
      });
    });

    revalidatePath(`/${parsed.data.locale}/admin`);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
