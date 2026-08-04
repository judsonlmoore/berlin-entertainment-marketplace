"use server";

import { type ActionResult, toActionError } from "@/src/actions/_shared";
import { z } from "zod";
import { auth, signOut } from "@/src/auth";
import { getActorContext } from "@/src/db/queries/actor";
import { anonymizeUserAccount } from "@/src/db/queries/anonymization";
import { AppError } from "@/src/domain/errors";
import { checkRateLimit, rateLimitKey } from "@/src/domain/rate-limit";

const deleteAccountSchema = z.object({
  confirmationText: z.string().trim(),
  userEmail: z.string().trim(),
});

/**
 * Permanently delete (anonymize) a user account.
 *
 * This action:
 * - Validates the user owns the account
 * - Checks for active bookings or disputes
 * - Anonymizes all PII (name, email, contact methods)
 * - Removes OAuth/provider links, authenticators, and sessions
 * - Creates an audit trail
 *
 * The operation is permanent and irreversible. Signing in again with the same
 * provider creates a fresh user account.
 *
 * @param input - Confirmation text (must be exactly DELETE) and user email
 * @returns ActionResult indicating success or failure
 */
export async function deleteUserAccount(
  input: z.infer<typeof deleteAccountSchema>,
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new AppError("unauthorized", "Sign in required");
    }

    checkRateLimit({
      key: rateLimitKey("account.delete", session.user.id),
      limit: 3,
      windowMs: 3600_000, // 1 hour
    });

    const parsed = deleteAccountSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid input", {
        issues: parsed.error.issues,
      });
    }

    const actor = await getActorContext(session.user.id);
    if (!actor) {
      throw new AppError("unauthorized", "Sign in required");
    }

    if (parsed.data.confirmationText !== "DELETE") {
      throw new AppError(
        "validation",
        "Confirmation text must be exactly DELETE",
      );
    }

    if (parsed.data.userEmail !== session.user.email) {
      throw new AppError("validation", "Email does not match your account");
    }

    await anonymizeUserAccount(
      session.user.id,
      "user_requested",
      session.user.id,
    );

    await signOut({ redirect: false });

    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
