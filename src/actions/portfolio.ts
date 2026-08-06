"use server";

import {
  type ActionResult,
  requireActor,
  toActionError,
} from "@/src/actions/_shared";
import { and, asc, count, eq, type SQL } from "drizzle-orm";
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

const ownerFieldsSchema = z
  .object({
    entertainerProfileId: z.string().uuid().optional(),
    venueId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    const hasProfile = Boolean(data.entertainerProfileId);
    const hasVenue = Boolean(data.venueId);
    if (hasProfile === hasVenue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exactly one of entertainerProfileId or venueId is required",
      });
    }
  });

type PortfolioOwner =
  | {
      kind: "entertainer";
      entertainerProfileId: string;
      ownerFilter: SQL;
      subjectType: "entertainer_profile";
      subjectId: string;
    }
  | {
      kind: "venue";
      venueId: string;
      ownerFilter: SQL;
      subjectType: "venue";
      subjectId: string;
    };

async function requirePortfolioOwner(input: {
  entertainerProfileId?: string | undefined;
  venueId?: string | undefined;
}): Promise<{
  actor: Awaited<ReturnType<typeof requireActor>>["actor"];
  auditUserId: string;
  db: ReturnType<typeof getDb>;
  owner: PortfolioOwner;
}> {
  const { actor, auditUserId } = await requireActor();
  const db = getDb();

  if (input.entertainerProfileId && !input.venueId) {
    if (!can(actor, "entertainer.manage_own_profile")) {
      throw new AppError("forbidden", "Not your entertainer profile");
    }
    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.id, input.entertainerProfileId),
    });
    if (!profile || profile.userId !== actor.userId) {
      throw new AppError("forbidden", "Not your entertainer profile");
    }
    return {
      actor,
      auditUserId,
      db,
      owner: {
        kind: "entertainer",
        entertainerProfileId: profile.id,
        ownerFilter: eq(portfolioItems.entertainerProfileId, profile.id),
        subjectType: "entertainer_profile",
        subjectId: profile.id,
      },
    };
  }

  if (input.venueId && !input.entertainerProfileId) {
    if (!can(actor, "venue.manage", { venueId: input.venueId })) {
      throw new AppError("forbidden", "Not your venue");
    }
    return {
      actor,
      auditUserId,
      db,
      owner: {
        kind: "venue",
        venueId: input.venueId,
        ownerFilter: eq(portfolioItems.venueId, input.venueId),
        subjectType: "venue",
        subjectId: input.venueId,
      },
    };
  }

  throw new AppError(
    "validation",
    "Exactly one of entertainerProfileId or venueId is required",
  );
}

function ownerInsertValues(owner: PortfolioOwner) {
  if (owner.kind === "entertainer") {
    return { entertainerProfileId: owner.entertainerProfileId };
  }
  return { venueId: owner.venueId };
}

async function nextSortOrder(db: ReturnType<typeof getDb>, ownerFilter: SQL) {
  const [row] = await db
    .select({ value: count() })
    .from(portfolioItems)
    .where(ownerFilter);
  return row?.value ?? 0;
}

async function assertPortfolioCapacity(
  db: ReturnType<typeof getDb>,
  ownerFilter: SQL,
) {
  const [row] = await db
    .select({ value: count() })
    .from(portfolioItems)
    .where(ownerFilter);
  if ((row?.value ?? 0) >= PORTFOLIO_MAX_ITEMS) {
    throw new AppError("validation", "Portfolio item limit reached");
  }
}

const linkSchema = ownerFieldsSchema.and(
  z.object({
    url: z.string().trim().min(1).max(500),
    caption: z.string().trim().max(500).optional(),
    locale: localeSchema,
  }),
);

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

    const { auditUserId, owner, db } = await requirePortfolioOwner(parsed.data);
    await assertPortfolioCapacity(db, owner.ownerFilter);

    const sortOrder = await nextSortOrder(db, owner.ownerFilter);
    const [created] = await db
      .insert(portfolioItems)
      .values({
        ...ownerInsertValues(owner),
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
    return { ok: true, id: created!.id };
  } catch (error) {
    return toActionError(error);
  }
}

const youtubeSchema = ownerFieldsSchema.and(
  z.object({
    url: z.string().trim().min(1).max(500),
    caption: z.string().trim().max(500).optional(),
    locale: localeSchema,
  }),
);

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

    const { auditUserId, owner, db } = await requirePortfolioOwner(parsed.data);

    const existingYoutube = await db.query.portfolioItems.findFirst({
      where: and(owner.ownerFilter, eq(portfolioItems.kind, "youtube")),
      columns: { id: true },
    });
    if (existingYoutube) {
      throw new AppError(
        "validation",
        "Only one YouTube embed is allowed; remove the current one first",
      );
    }

    await assertPortfolioCapacity(db, owner.ownerFilter);

    const sortOrder = await nextSortOrder(db, owner.ownerFilter);
    const [created] = await db
      .insert(portfolioItems)
      .values({
        ...ownerInsertValues(owner),
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
    return { ok: true, id: created!.id };
  } catch (error) {
    return toActionError(error);
  }
}

const removeSchema = ownerFieldsSchema.and(
  z.object({
    itemId: z.string().uuid(),
    locale: localeSchema,
  }),
);

export async function removePortfolioItem(
  input: z.infer<typeof removeSchema>,
): Promise<ActionResult> {
  try {
    const parsed = removeSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid portfolio removal");
    }

    const { auditUserId, owner, db } = await requirePortfolioOwner(parsed.data);

    const item = await db.query.portfolioItems.findFirst({
      where: and(eq(portfolioItems.id, parsed.data.itemId), owner.ownerFilter),
    });
    if (!item) {
      throw new AppError("not_found", "Portfolio item not found");
    }

    if (item.kind === "image" && item.blobKey) {
      await deletePortfolioImage(item.blobKey);
      if (item.thumbBlobKey) {
        await deletePortfolioImage(item.thumbBlobKey);
      }
    }

    await db.delete(portfolioItems).where(eq(portfolioItems.id, item.id));
    await db.insert(auditEvents).values({
      actorUserId: auditUserId,
      action: "portfolio.removed",
      subjectType: "portfolio_item",
      subjectId: item.id,
      metadata: { kind: item.kind },
    });
    return { ok: true, id: item.id };
  } catch (error) {
    return toActionError(error);
  }
}

const reorderSchema = ownerFieldsSchema.and(
  z.object({
    orderedIds: z.array(z.string().uuid()).min(1).max(PORTFOLIO_MAX_ITEMS),
    locale: localeSchema,
  }),
);

export async function reorderPortfolioItems(
  input: z.infer<typeof reorderSchema>,
): Promise<ActionResult> {
  try {
    const parsed = reorderSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid portfolio reorder");
    }

    const { auditUserId, owner, db } = await requirePortfolioOwner(parsed.data);

    const existing = await db
      .select({ id: portfolioItems.id })
      .from(portfolioItems)
      .where(owner.ownerFilter);

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
        subjectType: owner.subjectType,
        subjectId: owner.subjectId,
        metadata: { count: parsed.data.orderedIds.length },
      });
    });
    return { ok: true, id: owner.subjectId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listOwnPortfolioItems(input: {
  entertainerProfileId?: string | undefined;
  venueId?: string | undefined;
}) {
  try {
    const { owner, db } = await requirePortfolioOwner(input);

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
      .where(owner.ownerFilter)
      .orderBy(asc(portfolioItems.sortOrder), asc(portfolioItems.createdAt));
  } catch {
    return [];
  }
}
