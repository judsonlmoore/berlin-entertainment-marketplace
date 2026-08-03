"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import { getActorContext } from "@/src/db/queries/actor";
import { users } from "@/src/db/schema";
import { auditEvents, venueMemberships } from "@/src/db/schema/marketplace";
import { AppError } from "@/src/domain/errors";
import { can } from "@/src/domain/permissions";
import { canRemoveMembership } from "@/src/domain/venue-membership";

export type ActionResult =
  { ok: true; id?: string } | { ok: false; code: string; message: string };

function toActionError(error: unknown): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, code: error.code, message: error.message };
  }
  throw error;
}

const inviteSchema = z.object({
  venueId: z.string().uuid(),
  email: z.string().trim().email().max(320),
  role: z.enum(["owner", "member"]).default("member"),
  locale: z.enum(["en", "de"]).default("en"),
});

export async function inviteVenueMember(
  input: z.infer<typeof inviteSchema>,
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new AppError("unauthorized", "Sign in required");
    }
    const actor = await getActorContext(session.user.id);
    if (!actor) {
      throw new AppError("unauthorized", "Sign in required");
    }

    const parsed = inviteSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid invitation");
    }
    if (!can(actor, "venue.manage", { venueId: parsed.data.venueId })) {
      throw new AppError("forbidden", "Venue owner required");
    }

    const db = getDb();
    const invitee = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email.toLowerCase()),
    });
    if (!invitee) {
      throw new AppError(
        "not_found",
        "No Salon account exists for that email yet",
      );
    }

    const existing = await db.query.venueMemberships.findFirst({
      where: and(
        eq(venueMemberships.venueId, parsed.data.venueId),
        eq(venueMemberships.userId, invitee.id),
      ),
    });

    if (existing?.status === "active") {
      throw new AppError("conflict", "User is already an active member");
    }

    let membershipId = existing?.id;

    await db.transaction(async (tx) => {
      if (existing) {
        await tx
          .update(venueMemberships)
          .set({
            role: parsed.data.role,
            status: "invited",
            updatedAt: new Date(),
          })
          .where(eq(venueMemberships.id, existing.id));
      } else {
        const [created] = await tx
          .insert(venueMemberships)
          .values({
            venueId: parsed.data.venueId,
            userId: invitee.id,
            role: parsed.data.role,
            status: "invited",
          })
          .returning();
        membershipId = created?.id;
      }

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "venue_membership.invited",
        subjectType: "venue_membership",
        subjectId: membershipId ?? parsed.data.venueId,
        metadata: {
          venueId: parsed.data.venueId,
          inviteeUserId: invitee.id,
          role: parsed.data.role,
        },
      });
    });

    revalidatePath(
      `/${parsed.data.locale}/profile/venues/${parsed.data.venueId}`,
    );
    return { ok: true, ...(membershipId ? { id: membershipId } : {}) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function acceptVenueInvitation(
  membershipId: string,
  locale: "en" | "de" = "en",
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new AppError("unauthorized", "Sign in required");
    }

    const db = getDb();
    const membership = await db.query.venueMemberships.findFirst({
      where: eq(venueMemberships.id, membershipId),
    });
    if (!membership || membership.userId !== session.user.id) {
      throw new AppError("forbidden", "Invitation not found for this account");
    }
    if (membership.status !== "invited") {
      throw new AppError("conflict", "Invitation is not pending");
    }

    await db.transaction(async (tx) => {
      await tx
        .update(venueMemberships)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(venueMemberships.id, membershipId));
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "venue_membership.accepted",
        subjectType: "venue_membership",
        subjectId: membershipId,
        metadata: { venueId: membership.venueId },
      });
    });

    revalidatePath(`/${locale}/profile`);
    revalidatePath(`/${locale}/profile/venues/${membership.venueId}`);
    return { ok: true, id: membershipId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeVenueMember(
  membershipId: string,
  locale: "en" | "de" = "en",
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new AppError("unauthorized", "Sign in required");
    }
    const actor = await getActorContext(session.user.id);
    if (!actor) {
      throw new AppError("unauthorized", "Sign in required");
    }

    const db = getDb();
    const membership = await db.query.venueMemberships.findFirst({
      where: eq(venueMemberships.id, membershipId),
    });
    if (!membership) {
      throw new AppError("not_found", "Membership not found");
    }
    if (!can(actor, "venue.manage", { venueId: membership.venueId })) {
      throw new AppError("forbidden", "Venue owner required");
    }

    const all = await db.query.venueMemberships.findMany({
      where: eq(venueMemberships.venueId, membership.venueId),
    });
    const decision = canRemoveMembership(
      all.map((row) => ({
        id: row.id,
        userId: row.userId,
        role: row.role,
        status: row.status,
      })),
      membershipId,
    );
    if (!decision.ok) {
      throw new AppError(
        decision.reason === "last_owner" ? "conflict" : "not_found",
        decision.reason === "last_owner"
          ? "Cannot remove the last active owner"
          : "Membership not found",
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(venueMemberships)
        .set({ status: "removed", updatedAt: new Date() })
        .where(eq(venueMemberships.id, membershipId));
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "venue_membership.removed",
        subjectType: "venue_membership",
        subjectId: membershipId,
        metadata: {
          venueId: membership.venueId,
          removedUserId: membership.userId,
        },
      });
    });

    revalidatePath(`/${locale}/profile/venues/${membership.venueId}`);
    return { ok: true, id: membershipId };
  } catch (error) {
    return toActionError(error);
  }
}
