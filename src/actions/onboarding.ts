"use server";

import { type ActionResult, toActionError } from "@/src/actions/_shared";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import {
  auditEvents,
  marketplaceAccounts,
  userRoles,
} from "@/src/db/schema/marketplace";
import { AppError } from "@/src/domain/errors";
import { checkRateLimit, rateLimitKey } from "@/src/domain/rate-limit";

const roleSelectionSchema = z.object({
  role: z.enum(["entertainer", "venue"]),
  locale: z.enum(["en", "de"]).default("en"),
});

/**
 * Self-serve XOR signup: create an active account with exactly one role.
 */
export async function selectInitialRole(
  input: z.infer<typeof roleSelectionSchema>,
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new AppError("unauthorized", "Sign in required");
    }
    checkRateLimit({
      key: rateLimitKey("onboarding.roleselection", session.user.id),
      limit: 5,
      windowMs: 60_000,
    });

    const parsed = roleSelectionSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid role selection", {
        issues: parsed.error.issues,
      });
    }

    const db = getDb();
    const existingRole = await db.query.userRoles.findFirst({
      where: eq(userRoles.userId, session.user.id),
    });

    if (existingRole) {
      throw new AppError(
        "conflict",
        "Role already selected; continue to the marketplace",
      );
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      const existing = await tx.query.marketplaceAccounts.findFirst({
        where: eq(marketplaceAccounts.userId, session.user.id),
      });

      if (!existing) {
        await tx.insert(marketplaceAccounts).values({
          userId: session.user.id,
          accountStatus: "active",
          termsAcceptedAt: now,
        });
      } else if (existing.accountStatus === "suspended") {
        throw new AppError("forbidden", "This account is suspended");
      }

      await tx.insert(userRoles).values({
        userId: session.user.id,
        role: parsed.data.role,
      });

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "onboarding.role_selected",
        subjectType: "user",
        subjectId: session.user.id,
        metadata: {
          role: parsed.data.role,
        },
      });
    });

    revalidatePath(`/${parsed.data.locale}/onboarding`);
    revalidatePath(`/${parsed.data.locale}/marketplace`);
    revalidatePath(`/${parsed.data.locale}`);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
