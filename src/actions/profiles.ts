"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import { getActorContext } from "@/src/db/queries/actor";
import {
  auditEvents,
  contactMethods,
  entertainerProfiles,
  venueMemberships,
  venueSpaces,
  venues,
} from "@/src/db/schema/marketplace";
import { AppError } from "@/src/domain/errors";
import { can } from "@/src/domain/permissions";
import {
  canOwnerTransitionProfile,
  canStaffTransitionProfile,
  type ProfilePublicationState,
} from "@/src/domain/profile-publication";

export type ActionResult =
  { ok: true; id?: string } | { ok: false; code: string; message: string };

const localeSchema = z.enum(["en", "de"]).default("en");

const optionalUrlField = z
  .string()
  .trim()
  .url()
  .max(500)
  .optional()
  .or(z.literal(""));

const socialLinksSchema = z
  .object({
    instagram: optionalUrlField,
    facebook: optionalUrlField,
    tiktok: optionalUrlField,
    spotify: optionalUrlField,
    soundcloud: optionalUrlField,
  })
  .optional();

function compactSocialLinks(
  links?: z.infer<typeof socialLinksSchema>,
): Record<string, string> {
  if (!links) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(links)) {
    const trimmed = value?.trim();
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const entertainerSchema = z.object({
  actName: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(4000),
  groupSize: z.coerce.number().int().min(1).max(50),
  berlinBase: z.string().trim().min(1).max(200),
  travelRadiusKm: z.coerce.number().int().min(0).max(500),
  priceMinCents: z.coerce.number().int().min(0),
  priceMaxCents: z.coerce.number().int().min(0),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 60),
  technicalRequirements: z.string().trim().min(1).max(4000),
  genres: optionalText(500),
  performanceFormats: optionalText(500),
  languages: optionalText(500),
  accessibilityNotes: optionalText(2000),
  equipmentSupplied: optionalText(2000),
  websiteUrl: optionalUrlField,
  socialLinks: socialLinksSchema,
  contactEmail: z.string().trim().email().max(320),
  locale: localeSchema,
});

const venueProductionField = optionalText(500);

const venueSchema = z.object({
  name: z.string().trim().min(1).max(160),
  shortDescription: z.string().trim().min(1).max(500),
  addressLine1: z.string().trim().min(1).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  district: z.string().trim().min(1).max(120),
  postalCode: z.string().trim().min(4).max(16),
  latitude: z.string().trim().max(32).optional(),
  longitude: z.string().trim().max(32).optional(),
  venueType: z.string().trim().min(1).max(120),
  audienceDescription: z.string().trim().min(1).max(2000),
  capacity: z.coerce.number().int().min(1).max(100000),
  capacityContext: z.string().trim().max(500).optional(),
  productionNotes: z.string().trim().max(4000).optional(),
  productionPa: venueProductionField,
  productionMixer: venueProductionField,
  productionMics: venueProductionField,
  productionLighting: venueProductionField,
  productionBackline: venueProductionField,
  productionPower: venueProductionField,
  productionStage: venueProductionField,
  houseRules: optionalText(4000),
  loadInNotes: optionalText(4000),
  accessibilityNotes: optionalText(2000),
  socialLinks: socialLinksSchema,
  websiteUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  contactEmail: z.string().trim().email().max(320),
  locale: localeSchema,
});

function buildVenueProductionResources(
  data: z.infer<typeof venueSchema>,
): Record<string, string> {
  const resources: Record<string, string> = {
    notes: data.productionNotes?.trim() ?? "",
  };
  const structured: Record<string, string | undefined> = {
    pa: data.productionPa,
    mixer: data.productionMixer,
    mics: data.productionMics,
    lighting: data.productionLighting,
    backline: data.productionBackline,
    power: data.productionPower,
    stage: data.productionStage,
  };
  for (const [key, value] of Object.entries(structured)) {
    const trimmed = value?.trim();
    if (trimmed) resources[key] = trimmed;
  }
  return resources;
}

function optionalNullableText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function requireActor() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AppError("unauthorized", "Sign in required");
  }
  const actor = await getActorContext(session.user.id);
  if (!actor) {
    throw new AppError("unauthorized", "Sign in required");
  }
  return { session, actor };
}

function toActionError(error: unknown): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, code: error.code, message: error.message };
  }
  throw error;
}

export async function upsertEntertainerProfile(
  input: z.infer<typeof entertainerSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor } = await requireActor();
    if (!can(actor, "entertainer.manage_own_profile")) {
      throw new AppError("forbidden", "Entertainer role required");
    }

    const parsed = entertainerSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid entertainer profile");
    }
    if (parsed.data.priceMaxCents < parsed.data.priceMinCents) {
      throw new AppError("validation", "Price max must be >= min");
    }

    const db = getDb();
    const existing = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.userId, session.user.id),
    });

    const now = new Date();
    const values = {
      actName: parsed.data.actName,
      category: parsed.data.category,
      description: parsed.data.description,
      groupSize: parsed.data.groupSize,
      berlinBase: parsed.data.berlinBase,
      travelRadiusKm: parsed.data.travelRadiusKm,
      priceMinCents: parsed.data.priceMinCents,
      priceMaxCents: parsed.data.priceMaxCents,
      durationMinutes: parsed.data.durationMinutes,
      technicalRequirements: parsed.data.technicalRequirements,
      genres: optionalNullableText(parsed.data.genres),
      performanceFormats: optionalNullableText(parsed.data.performanceFormats),
      languages: optionalNullableText(parsed.data.languages),
      accessibilityNotes: optionalNullableText(parsed.data.accessibilityNotes),
      equipmentSupplied: optionalNullableText(parsed.data.equipmentSupplied),
      websiteUrl: optionalNullableText(parsed.data.websiteUrl),
      socialLinks: compactSocialLinks(parsed.data.socialLinks),
      publicationState:
        existing?.publicationState === "approved" ||
        existing?.publicationState === "submitted"
          ? ("draft" as const)
          : ((existing?.publicationState as
              ProfilePublicationState | undefined) ?? "draft"),
      updatedAt: now,
    };

    let profileId = existing?.id;

    await db.transaction(async (tx) => {
      if (existing) {
        await tx
          .update(entertainerProfiles)
          .set(values)
          .where(eq(entertainerProfiles.id, existing.id));
      } else {
        const [created] = await tx
          .insert(entertainerProfiles)
          .values({
            userId: session.user.id,
            ...values,
            currency: "EUR",
          })
          .returning();
        profileId = created?.id;
      }

      await tx.insert(contactMethods).values({
        ownerType: "entertainer",
        ownerId: profileId ?? session.user.id,
        kind: "email",
        valueEncrypted: parsed.data.contactEmail,
        isPreferred: true,
      });

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "entertainer_profile.upserted",
        subjectType: "entertainer_profile",
        subjectId: profileId ?? session.user.id,
        metadata: { publicationState: values.publicationState },
      });
    });

    revalidatePath(`/${parsed.data.locale}/profile`);
    revalidatePath(`/${parsed.data.locale}/admin`);
    return { ok: true, ...(profileId ? { id: profileId } : {}) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function submitEntertainerProfile(
  locale: "en" | "de" = "en",
): Promise<ActionResult> {
  try {
    const { session, actor } = await requireActor();
    if (!can(actor, "entertainer.manage_own_profile")) {
      throw new AppError("forbidden", "Entertainer role required");
    }

    const db = getDb();
    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.userId, session.user.id),
    });
    if (!profile) {
      throw new AppError("not_found", "Create a profile draft first");
    }

    const from = profile.publicationState as ProfilePublicationState;
    if (!canOwnerTransitionProfile(from, "submitted")) {
      throw new AppError("invalid_transition", `Cannot submit from ${from}`);
    }

    await db.transaction(async (tx) => {
      await tx
        .update(entertainerProfiles)
        .set({ publicationState: "submitted", updatedAt: new Date() })
        .where(eq(entertainerProfiles.id, profile.id));
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "entertainer_profile.submitted",
        subjectType: "entertainer_profile",
        subjectId: profile.id,
        metadata: { from, to: "submitted" },
      });
    });

    revalidatePath(`/${locale}/profile`);
    revalidatePath(`/${locale}/admin`);
    return { ok: true, id: profile.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createVenue(
  input: z.infer<typeof venueSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor } = await requireActor();
    if (!can(actor, "venue.create")) {
      throw new AppError("forbidden", "Venue role required");
    }

    const parsed = venueSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid venue profile");
    }

    const db = getDb();
    const now = new Date();
    let venueId: string | undefined;

    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(venues)
        .values({
          name: parsed.data.name,
          shortDescription: parsed.data.shortDescription,
          addressLine1: parsed.data.addressLine1,
          ...(parsed.data.addressLine2
            ? { addressLine2: parsed.data.addressLine2 }
            : {}),
          district: parsed.data.district,
          postalCode: parsed.data.postalCode,
          ...(parsed.data.latitude ? { latitude: parsed.data.latitude } : {}),
          ...(parsed.data.longitude
            ? { longitude: parsed.data.longitude }
            : {}),
          venueType: parsed.data.venueType,
          audienceDescription: parsed.data.audienceDescription,
          capacity: parsed.data.capacity,
          ...(parsed.data.capacityContext
            ? { capacityContext: parsed.data.capacityContext }
            : {}),
          productionResources: buildVenueProductionResources(parsed.data),
          houseRules: optionalNullableText(parsed.data.houseRules),
          loadInNotes: optionalNullableText(parsed.data.loadInNotes),
          accessibilityNotes: optionalNullableText(parsed.data.accessibilityNotes),
          socialLinks: compactSocialLinks(parsed.data.socialLinks),
          ...(parsed.data.websiteUrl
            ? { websiteUrl: parsed.data.websiteUrl }
            : {}),
          publicationState: "draft",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!created) {
        throw new AppError("validation", "Failed to create venue");
      }
      venueId = created.id;

      await tx.insert(venueMemberships).values({
        venueId: created.id,
        userId: session.user.id,
        role: "owner",
        status: "active",
      });

      await tx.insert(contactMethods).values({
        ownerType: "venue",
        ownerId: created.id,
        kind: "email",
        valueEncrypted: parsed.data.contactEmail,
        isPreferred: true,
      });

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "venue.created",
        subjectType: "venue",
        subjectId: created.id,
        metadata: { publicationState: "draft" },
      });
    });

    revalidatePath(`/${parsed.data.locale}/profile`);
    return { ok: true, ...(venueId ? { id: venueId } : {}) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateVenue(
  venueId: string,
  input: z.infer<typeof venueSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor } = await requireActor();
    if (!can(actor, "venue.manage", { venueId })) {
      throw new AppError("forbidden", "Venue owner required");
    }

    const parsed = venueSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid venue profile");
    }

    const db = getDb();
    const existing = await db.query.venues.findFirst({
      where: eq(venues.id, venueId),
    });
    if (!existing) {
      throw new AppError("not_found", "Venue not found");
    }

    const nextState: ProfilePublicationState =
      existing.publicationState === "approved" ||
      existing.publicationState === "submitted"
        ? "draft"
        : (existing.publicationState as ProfilePublicationState);

    await db.transaction(async (tx) => {
      await tx
        .update(venues)
        .set({
          name: parsed.data.name,
          shortDescription: parsed.data.shortDescription,
          addressLine1: parsed.data.addressLine1,
          addressLine2: parsed.data.addressLine2 ?? null,
          district: parsed.data.district,
          postalCode: parsed.data.postalCode,
          latitude: parsed.data.latitude ?? null,
          longitude: parsed.data.longitude ?? null,
          venueType: parsed.data.venueType,
          audienceDescription: parsed.data.audienceDescription,
          capacity: parsed.data.capacity,
          capacityContext: parsed.data.capacityContext ?? null,
          productionResources: buildVenueProductionResources(parsed.data),
          houseRules: optionalNullableText(parsed.data.houseRules),
          loadInNotes: optionalNullableText(parsed.data.loadInNotes),
          accessibilityNotes: optionalNullableText(parsed.data.accessibilityNotes),
          socialLinks: compactSocialLinks(parsed.data.socialLinks),
          websiteUrl: parsed.data.websiteUrl || null,
          publicationState: nextState,
          updatedAt: new Date(),
        })
        .where(eq(venues.id, venueId));

      await tx.insert(contactMethods).values({
        ownerType: "venue",
        ownerId: venueId,
        kind: "email",
        valueEncrypted: parsed.data.contactEmail,
        isPreferred: true,
      });

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "venue.updated",
        subjectType: "venue",
        subjectId: venueId,
        metadata: { publicationState: nextState },
      });
    });

    revalidatePath(`/${parsed.data.locale}/profile`);
    revalidatePath(`/${parsed.data.locale}/profile/venues/${venueId}`);
    revalidatePath(`/${parsed.data.locale}/admin`);
    return { ok: true, id: venueId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function submitVenueProfile(
  venueId: string,
  locale: "en" | "de" = "en",
): Promise<ActionResult> {
  try {
    const { session, actor } = await requireActor();
    if (!can(actor, "venue.manage", { venueId })) {
      throw new AppError("forbidden", "Venue owner required");
    }

    const db = getDb();
    const venue = await db.query.venues.findFirst({
      where: eq(venues.id, venueId),
    });
    if (!venue) {
      throw new AppError("not_found", "Venue not found");
    }

    const from = venue.publicationState as ProfilePublicationState;
    if (!canOwnerTransitionProfile(from, "submitted")) {
      throw new AppError("invalid_transition", `Cannot submit from ${from}`);
    }

    const ownerMembership = await db.query.venueMemberships.findFirst({
      where: and(
        eq(venueMemberships.venueId, venueId),
        eq(venueMemberships.role, "owner"),
        eq(venueMemberships.status, "active"),
      ),
    });
    if (!ownerMembership) {
      throw new AppError("validation", "Venue requires an active owner");
    }

    await db.transaction(async (tx) => {
      await tx
        .update(venues)
        .set({ publicationState: "submitted", updatedAt: new Date() })
        .where(eq(venues.id, venueId));
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "venue.submitted",
        subjectType: "venue",
        subjectId: venueId,
        metadata: { from, to: "submitted" },
      });
    });

    revalidatePath(`/${locale}/profile`);
    revalidatePath(`/${locale}/profile/venues/${venueId}`);
    revalidatePath(`/${locale}/admin`);
    return { ok: true, id: venueId };
  } catch (error) {
    return toActionError(error);
  }
}

const staffProfileReviewSchema = z.object({
  subjectType: z.enum(["entertainer", "venue"]),
  subjectId: z.string().uuid(),
  nextState: z.enum([
    "draft",
    "submitted",
    "approved",
    "changes_requested",
    "suspended",
  ]),
  reason: z.string().trim().min(1).max(1000),
  locale: localeSchema,
});

export async function staffReviewProfile(
  input: z.infer<typeof staffProfileReviewSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor } = await requireActor();
    if (!can(actor, "admin.review_profiles")) {
      throw new AppError("forbidden", "Staff only");
    }

    const parsed = staffProfileReviewSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid profile review");
    }

    const db = getDb();
    if (parsed.data.subjectType === "entertainer") {
      const profile = await db.query.entertainerProfiles.findFirst({
        where: eq(entertainerProfiles.id, parsed.data.subjectId),
      });
      if (!profile) {
        throw new AppError("not_found", "Entertainer profile not found");
      }
      const from = profile.publicationState as ProfilePublicationState;
      if (!canStaffTransitionProfile(from, parsed.data.nextState)) {
        throw new AppError(
          "invalid_transition",
          `Cannot move entertainer profile from ${from} to ${parsed.data.nextState}`,
        );
      }
      await db.transaction(async (tx) => {
        await tx
          .update(entertainerProfiles)
          .set({
            publicationState: parsed.data.nextState,
            updatedAt: new Date(),
          })
          .where(eq(entertainerProfiles.id, profile.id));
        await tx.insert(auditEvents).values({
          actorUserId: session.user.id,
          action: "entertainer_profile.reviewed",
          subjectType: "entertainer_profile",
          subjectId: profile.id,
          metadata: {
            from,
            to: parsed.data.nextState,
            reason: parsed.data.reason,
          },
        });
      });
    } else {
      const venue = await db.query.venues.findFirst({
        where: eq(venues.id, parsed.data.subjectId),
      });
      if (!venue) {
        throw new AppError("not_found", "Venue not found");
      }
      const from = venue.publicationState as ProfilePublicationState;
      if (!canStaffTransitionProfile(from, parsed.data.nextState)) {
        throw new AppError(
          "invalid_transition",
          `Cannot move venue from ${from} to ${parsed.data.nextState}`,
        );
      }
      await db.transaction(async (tx) => {
        await tx
          .update(venues)
          .set({
            publicationState: parsed.data.nextState,
            updatedAt: new Date(),
          })
          .where(eq(venues.id, venue.id));
        await tx.insert(auditEvents).values({
          actorUserId: session.user.id,
          action: "venue.reviewed",
          subjectType: "venue",
          subjectId: venue.id,
          metadata: {
            from,
            to: parsed.data.nextState,
            reason: parsed.data.reason,
          },
        });
      });
    }

    revalidatePath(`/${parsed.data.locale}/admin`);
    revalidatePath(`/${parsed.data.locale}/profile`);
    return { ok: true, id: parsed.data.subjectId };
  } catch (error) {
    return toActionError(error);
  }
}

const venueSpaceSchema = z.object({
  venueId: z.string().uuid(),
  spaceId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  capacity: z.coerce.number().int().min(1).max(100000),
  stageDimensions: optionalText(200),
  accessibilityNotes: optionalText(2000),
  locale: localeSchema,
});

export async function upsertVenueSpace(
  input: z.infer<typeof venueSpaceSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor } = await requireActor();
    const parsed = venueSpaceSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid venue space");
    }
    if (!can(actor, "venue.manage", { venueId: parsed.data.venueId })) {
      throw new AppError("forbidden", "Venue owner required");
    }

    const db = getDb();
    const now = new Date();
    const values = {
      venueId: parsed.data.venueId,
      name: parsed.data.name,
      capacity: parsed.data.capacity,
      stageDimensions: optionalNullableText(parsed.data.stageDimensions),
      accessibilityNotes: optionalNullableText(parsed.data.accessibilityNotes),
      updatedAt: now,
    };

    let spaceId = parsed.data.spaceId;
    if (parsed.data.spaceId) {
      const existing = await db.query.venueSpaces.findFirst({
        where: eq(venueSpaces.id, parsed.data.spaceId),
      });
      if (!existing || existing.venueId !== parsed.data.venueId) {
        throw new AppError("not_found", "Venue space not found");
      }
      await db
        .update(venueSpaces)
        .set(values)
        .where(eq(venueSpaces.id, parsed.data.spaceId));
    } else {
      const [created] = await db
        .insert(venueSpaces)
        .values({ ...values, createdAt: now })
        .returning();
      spaceId = created?.id;
    }

    await db.insert(auditEvents).values({
      actorUserId: session.user.id,
      action: parsed.data.spaceId ? "venue_space.updated" : "venue_space.created",
      subjectType: "venue_space",
      subjectId: spaceId ?? parsed.data.venueId,
      metadata: { venueId: parsed.data.venueId },
    });

    revalidatePath(`/${parsed.data.locale}/profile/venues/${parsed.data.venueId}`);
    return { ok: true, ...(spaceId ? { id: spaceId } : {}) };
  } catch (error) {
    return toActionError(error);
  }
}
