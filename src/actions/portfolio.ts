"use server";

import {
  type ActionResult,
  requireActor,
  toActionError,
} from "@/src/actions/_shared";
import { and, asc, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/src/db/client";
import {
  auditEvents,
  entertainerProfiles,
  portfolioItems,
} from "@/src/db/schema/marketplace";
import { AppError } from "@/src/domain/errors";
import {
  PORTFOLIO_MAX_ITEMS,
  validatePortfolioLinkInput,
  validatePortfolioYouTubeInput,
} from "@/src/domain/portfolio";
import { can } from "@/src/domain/permissions";
import { deletePortfolioImage } from "@/src/integrations/portfolio-image-store";

const localeSchema = z.enum(["en", "de"]).default("en");

async function requireEntertainerOwner(entertainerProfileId: string) {
  const { actor, auditUserId } = await requireActor();
  if (!can(actor, "entertainer.manage_own_profile")) {
    throw new AppError("forbidden", "Not your entertainer profile");
  }

  const db = getDb();
  const profile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.id, entertainerProfileId),
  });
  if (!profile || profile.userId !== actor.userId) {
    throw new AppError("forbidden", "Not your entertainer profile");
  }

  return { actor, auditUserId, profile, db };
}

async function nextSortOrder(db: ReturnType<typeof getDb>, profileId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(portfolioItems)
    .where(eq(portfolioItems.entertainerProfileId, profileId));
  return row?.value ?? 0;
}

async function assertPortfolioCapacity(
  db: ReturnType<typeof getDb>,
  profileId: string,
) {
  const [row] = await db
    .select({ value: count() })
    .from(portfolioItems)
    .where(eq(portfolioItems.entertainerProfileId, profileId));
  if ((row?.value ?? 0) >= PORTFOLIO_MAX_ITEMS) {
    throw new AppError("validation", "Portfolio item limit reached");
  }
}

const linkSchema = z.object({
  entertainerProfileId: z.string().uuid(),
  url: z.string().trim().min(1).max(500),
  caption: z.string().trim().max(500).optional(),
  locale: localeSchema,
});

export async function addPortfolioLink(
  input: z.infer<typeof linkSchema>,
): Promise<ActionResult> {
  try {
    const parsed = linkSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid portfolio link");
    }
    const check = validatePortfolioLinkInput({
      url: parsed.data.url,
      ...(parsed.data.caption ? { caption: parsed.data.caption } : {}),
    });
    if (!check.ok) {
      throw new AppError("validation", check.reason);
    }

    const { auditUserId, profile, db } = await requireEntertainerOwner(
      parsed.data.entertainerProfileId,
    );
    await assertPortfolioCapacity(db, profile.id);

    const sortOrder = await nextSortOrder(db, profile.id);
    const [created] = await db
      .insert(portfolioItems)
      .values({
        entertainerProfileId: profile.id,
        kind: "link",
        url: check.url,
        caption: parsed.data.caption?.trim() || null,
        sortOrder,
      })
      .returning();

    await db.insert(auditEvents).values({
      actorUserId: auditUserId,
      action: "portfolio.link_added",
      subjectType: "portfolio_item",
      subjectId: created!.id,
      metadata: { kind: "link" },
    });

    revalidatePath(`/${parsed.data.locale}/profile`);
    return { ok: true, id: created!.id };
  } catch (error) {
    return toActionError(error);
  }
}

const youtubeSchema = z.object({
  entertainerProfileId: z.string().uuid(),
  url: z.string().trim().min(1).max(500),
  caption: z.string().trim().max(500).optional(),
  locale: localeSchema,
});

export async function addPortfolioYouTube(
  input: z.infer<typeof youtubeSchema>,
): Promise<ActionResult> {
  try {
    const parsed = youtubeSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid portfolio video");
    }
    const check = validatePortfolioYouTubeInput({
      url: parsed.data.url,
      ...(parsed.data.caption ? { caption: parsed.data.caption } : {}),
    });
    if (!check.ok) {
      throw new AppError("validation", check.reason);
    }

    const { auditUserId, profile, db } = await requireEntertainerOwner(
      parsed.data.entertainerProfileId,
    );

    const existingYoutube = await db.query.portfolioItems.findFirst({
      where: and(
        eq(portfolioItems.entertainerProfileId, profile.id),
        eq(portfolioItems.kind, "youtube"),
      ),
      columns: { id: true },
    });
    if (existingYoutube) {
      throw new AppError(
        "validation",
        "Only one YouTube embed is allowed; remove the current one first",
      );
    }

    await assertPortfolioCapacity(db, profile.id);

    const sortOrder = await nextSortOrder(db, profile.id);
    const [created] = await db
      .insert(portfolioItems)
      .values({
        entertainerProfileId: profile.id,
        kind: "youtube",
        url: check.url,
        caption: parsed.data.caption?.trim() || null,
        sortOrder,
      })
      .returning();

    await db.insert(auditEvents).values({
      actorUserId: auditUserId,
      action: "portfolio.youtube_added",
      subjectType: "portfolio_item",
      subjectId: created!.id,
      metadata: { kind: "youtube", videoId: check.videoId },
    });

    revalidatePath(`/${parsed.data.locale}/profile`);
    return { ok: true, id: created!.id };
  } catch (error) {
    return toActionError(error);
  }
}

const removeSchema = z.object({
  entertainerProfileId: z.string().uuid(),
  itemId: z.string().uuid(),
  locale: localeSchema,
});

export async function removePortfolioItem(
  input: z.infer<typeof removeSchema>,
): Promise<ActionResult> {
  try {
    const parsed = removeSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid portfolio removal");
    }

    const { auditUserId, profile, db } = await requireEntertainerOwner(
      parsed.data.entertainerProfileId,
    );

    const item = await db.query.portfolioItems.findFirst({
      where: and(
        eq(portfolioItems.id, parsed.data.itemId),
        eq(portfolioItems.entertainerProfileId, profile.id),
      ),
    });
    if (!item) {
      throw new AppError("not_found", "Portfolio item not found");
    }

    if (item.kind === "image" && item.blobKey) {
      await deletePortfolioImage(item.blobKey);
    }

    await db.delete(portfolioItems).where(eq(portfolioItems.id, item.id));
    await db.insert(auditEvents).values({
      actorUserId: auditUserId,
      action: "portfolio.removed",
      subjectType: "portfolio_item",
      subjectId: item.id,
      metadata: { kind: item.kind },
    });

    revalidatePath(`/${parsed.data.locale}/profile`);
    return { ok: true, id: item.id };
  } catch (error) {
    return toActionError(error);
  }
}

const reorderSchema = z.object({
  entertainerProfileId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1).max(PORTFOLIO_MAX_ITEMS),
  locale: localeSchema,
});

export async function reorderPortfolioItems(
  input: z.infer<typeof reorderSchema>,
): Promise<ActionResult> {
  try {
    const parsed = reorderSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid portfolio reorder");
    }

    const { auditUserId, profile, db } = await requireEntertainerOwner(
      parsed.data.entertainerProfileId,
    );

    const existing = await db
      .select({ id: portfolioItems.id })
      .from(portfolioItems)
      .where(eq(portfolioItems.entertainerProfileId, profile.id));

    const existingIds = new Set(existing.map((row) => row.id));
    if (
      parsed.data.orderedIds.length !== existingIds.size ||
      parsed.data.orderedIds.some((id) => !existingIds.has(id))
    ) {
      throw new AppError(
        "validation",
        "Reorder must include all portfolio items",
      );
    }

    await db.transaction(async (tx) => {
      for (const [index, id] of parsed.data.orderedIds.entries()) {
        await tx
          .update(portfolioItems)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(eq(portfolioItems.id, id));
      }
      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: "portfolio.reordered",
        subjectType: "entertainer_profile",
        subjectId: profile.id,
        metadata: { count: parsed.data.orderedIds.length },
      });
    });

    revalidatePath(`/${parsed.data.locale}/profile`);
    return { ok: true, id: profile.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listOwnPortfolioItems(entertainerProfileId: string) {
  try {
    const { actor } = await requireActor();
    if (!can(actor, "entertainer.manage_own_profile")) return [];

    const db = getDb();
    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.id, entertainerProfileId),
    });
    if (!profile || profile.userId !== actor.userId) return [];

    return db
      .select({
        id: portfolioItems.id,
        kind: portfolioItems.kind,
        caption: portfolioItems.caption,
        altText: portfolioItems.altText,
        url: portfolioItems.url,
        blobKey: portfolioItems.blobKey,
        sortOrder: portfolioItems.sortOrder,
      })
      .from(portfolioItems)
      .where(eq(portfolioItems.entertainerProfileId, entertainerProfileId))
      .orderBy(asc(portfolioItems.sortOrder), asc(portfolioItems.createdAt));
  } catch {
    return [];
  }
}
