"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import {
  auditEvents,
  contactMethods,
  marketplaceAccounts,
  userRoles,
} from "@/src/db/schema/marketplace";
import { users } from "@/src/db/schema";
import { AppError } from "@/src/domain/errors";
import { can } from "@/src/domain/permissions";
import { checkRateLimit, rateLimitKey } from "@/src/domain/rate-limit";
import { getActorContext } from "@/src/db/queries/actor";

const applicationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  berlinConnection: z.string().trim().min(1).max(500),
  applicationNote: z.string().trim().max(2000).optional(),
  contactEmail: z.string().trim().email().max(320),
  roles: z.array(z.enum(["entertainer", "venue"])).min(1),
  termsAccepted: z.literal(true),
  locale: z.enum(["en", "de"]).default("en"),
});

export type ActionResult =
  { ok: true } | { ok: false; code: string; message: string };

export async function submitMarketplaceApplication(
  input: z.infer<typeof applicationSchema>,
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new AppError("unauthorized", "Sign in required");
    }
    checkRateLimit({
      key: rateLimitKey("onboarding.submit", session.user.id),
      limit: 5,
      windowMs: 60_000,
    });

    const parsed = applicationSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid application", {
        issues: parsed.error.issues,
      });
    }

    const actor = await getActorContext(session.user.id);
    if (!actor || !can(actor, "onboarding.submit")) {
      throw new AppError("forbidden", "Cannot submit application");
    }

    const db = getDb();
    const existing = await db.query.marketplaceAccounts.findFirst({
      where: eq(marketplaceAccounts.userId, session.user.id),
    });

    if (existing && existing.approvalState !== "applied") {
      throw new AppError(
        "conflict",
        "Application already reviewed; contact staff for changes",
      );
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          name: parsed.data.name,
          preferredLocale: parsed.data.locale,
          updatedAt: now,
        })
        .where(eq(users.id, session.user.id));

      if (existing) {
        await tx
          .update(marketplaceAccounts)
          .set({
            applicationNote: parsed.data.applicationNote ?? null,
            berlinConnection: parsed.data.berlinConnection,
            termsAcceptedAt: now,
            updatedAt: now,
          })
          .where(eq(marketplaceAccounts.id, existing.id));
      } else {
        await tx.insert(marketplaceAccounts).values({
          userId: session.user.id,
          approvalState: "applied",
          applicationNote: parsed.data.applicationNote,
          berlinConnection: parsed.data.berlinConnection,
          termsAcceptedAt: now,
        });
      }

      await tx.delete(userRoles).where(eq(userRoles.userId, session.user.id));
      await tx.insert(userRoles).values(
        parsed.data.roles.map((role) => ({
          userId: session.user.id,
          role,
        })),
      );

      await tx.insert(contactMethods).values({
        ownerType: "user",
        ownerId: session.user.id,
        kind: "email",
        valueEncrypted: parsed.data.contactEmail,
        isPreferred: true,
      });

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "marketplace_application.submitted",
        subjectType: "marketplace_account",
        subjectId: session.user.id,
        metadata: {
          roles: parsed.data.roles,
          approvalState: "applied",
        },
      });
    });

    revalidatePath(`/${parsed.data.locale}/onboarding`);
    revalidatePath(`/${parsed.data.locale}/admin`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, code: error.code, message: error.message };
    }
    throw error;
  }
}
