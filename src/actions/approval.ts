"use server";

import { type ActionResult, toActionError } from "@/src/actions/_shared";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import { getActorContext } from "@/src/db/queries/actor";
import { auditEvents, marketplaceAccounts } from "@/src/db/schema/marketplace";
import {
  ACCOUNT_STATUSES,
  assertAccountStatusTransition,
  type AccountStatus,
} from "@/src/domain/approval";
import { AppError } from "@/src/domain/errors";
import { can } from "@/src/domain/permissions";

const changeAccountStatusSchema = z.object({
  marketplaceAccountId: z.string().uuid(),
  nextStatus: z.enum(ACCOUNT_STATUSES),
  reason: z.string().trim().min(1).max(1000),
  locale: z.enum(["en", "de"]).default("en"),
});

/** Staff suspend / reactivate an account. */
export async function changeAccountStatus(
  input: z.infer<typeof changeAccountStatusSchema>,
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new AppError("unauthorized", "Sign in required");
    }

    const parsed = changeAccountStatusSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid account status change");
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

    const current = account.accountStatus as AccountStatus;
    try {
      assertAccountStatusTransition(current, parsed.data.nextStatus);
    } catch {
      throw new AppError(
        "invalid_transition",
        `Cannot move from ${current} to ${parsed.data.nextStatus}`,
      );
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(marketplaceAccounts)
        .set({
          accountStatus: parsed.data.nextStatus,
          reviewedByUserId: session.user.id,
          reviewedAt: now,
          reviewReason: parsed.data.reason,
          updatedAt: now,
        })
        .where(eq(marketplaceAccounts.id, account.id));

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "marketplace_account.status_changed",
        subjectType: "marketplace_account",
        subjectId: account.id,
        metadata: {
          from: current,
          to: parsed.data.nextStatus,
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
    return toActionError(error);
  }
}

/** @deprecated Use changeAccountStatus */
export const changeApprovalState = changeAccountStatus;
