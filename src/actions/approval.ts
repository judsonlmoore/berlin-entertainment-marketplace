"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import { getActorContext } from "@/src/db/queries/actor";
import { auditEvents, marketplaceAccounts } from "@/src/db/schema/marketplace";
import {
  APPROVAL_STATES,
  assertApprovalTransition,
  type ApprovalState,
} from "@/src/domain/approval";
import { AppError } from "@/src/domain/errors";
import { can } from "@/src/domain/permissions";

const changeApprovalSchema = z.object({
  marketplaceAccountId: z.string().uuid(),
  nextState: z.enum(APPROVAL_STATES),
  reason: z.string().trim().min(1).max(1000),
  locale: z.enum(["en", "de"]).default("en"),
});

export type ActionResult =
  { ok: true } | { ok: false; code: string; message: string };

export async function changeApprovalState(
  input: z.infer<typeof changeApprovalSchema>,
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new AppError("unauthorized", "Sign in required");
    }

    const parsed = changeApprovalSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid approval change");
    }

    const actor = await getActorContext(session.user.id);
    if (!actor || !can(actor, "admin.change_approval")) {
      throw new AppError("forbidden", "Staff only");
    }

    const db = getDb();
    const account = await db.query.marketplaceAccounts.findFirst({
      where: eq(marketplaceAccounts.id, parsed.data.marketplaceAccountId),
    });

    if (!account) {
      throw new AppError("not_found", "Marketplace account not found");
    }

    const current = account.approvalState as ApprovalState;
    try {
      assertApprovalTransition(current, parsed.data.nextState);
    } catch {
      throw new AppError(
        "invalid_transition",
        `Cannot move from ${current} to ${parsed.data.nextState}`,
      );
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(marketplaceAccounts)
        .set({
          approvalState: parsed.data.nextState,
          reviewedByUserId: session.user.id,
          reviewedAt: now,
          reviewReason: parsed.data.reason,
          updatedAt: now,
        })
        .where(eq(marketplaceAccounts.id, account.id));

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "marketplace_account.approval_changed",
        subjectType: "marketplace_account",
        subjectId: account.id,
        metadata: {
          from: current,
          to: parsed.data.nextState,
          reason: parsed.data.reason,
          userId: account.userId,
        },
      });
    });

    revalidatePath(`/${parsed.data.locale}/admin`);
    revalidatePath(`/${parsed.data.locale}/onboarding`);
    revalidatePath(`/${parsed.data.locale}/marketplace`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, code: error.code, message: error.message };
    }
    throw error;
  }
}
