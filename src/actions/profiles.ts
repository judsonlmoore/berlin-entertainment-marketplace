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
import { upsertPreferredContact } from "@/src/db/queries/contacts";
import {
  auditEvents,
  entertainerProfiles,
  portfolioItems,
  venueSpaces,
  venues,
} from "@/src/db/schema/marketplace";
import { AppError } from "@/src/domain/errors";
import { checkEntertainerPublishReadiness } from "@/src/domain/entertainer-publish-readiness";
import { can } from "@/src/domain/permissions";
import {
  canOwnerTransitionProfile,
  type ProfilePublicationState,
} from "@/src/domain/profile-publication";
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  LONG_NOTES_MAX,
  NOTES_MAX,
  SHORT_DESCRIPTION_MAX,
  TECHNICAL_MAX,
  sanitizePlainText,
  validateRichTextField,
} from "@/src/domain/sanitize-input";

const localeSchema = z.enum(["en", "de"]).default("en");

/** Soft URL: invalid mid-edit values become empty so drafts can autosave. */
function softOptionalUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, 500);
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return trimmed;
  } catch {
    return "";
  }
}

const softUrlField = z.preprocess(softOptionalUrl, z.string().max(500));

const socialLinksSchema = z
  .object({
    instagram: softUrlField,
    facebook: softUrlField,
    tiktok: softUrlField,
    spotify: softUrlField,
    soundcloud: softUrlField,
    linkedin: softUrlField,
    youtube: softUrlField,
  })
  .partial()
  .optional();

function compactSocialLinks(
  links?: z.infer<typeof socialLinksSchema>,
): Record<string, string> {
  if (!links) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(links)) {
    const trimmed = softOptionalUrl(value);
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

/** Draft upsert: allow incomplete fields; submit-for-review enforces completeness. */
const entertainerSchema = z.object({
  actName: z.string().trim().min(1).max(160),
  category: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().max(8000).optional().or(z.literal("")),
  groupSize: z.coerce.number().int().min(1).max(50).default(1),
  berlinBase: z.string().trim().max(300).optional().or(z.literal("")),
  baseLatitude: z.string().trim().max(32).optional().or(z.literal("")),
  baseLongitude: z.string().trim().max(32).optional().or(z.literal("")),
  travelRadiusKm: z.coerce.number().int().min(0).max(500).default(25),
  priceMinCents: z.coerce.number().int().min(0).default(0),
  priceMaxCents: z.coerce.number().int().min(0).default(0),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 60)
    .default(60),
  technicalRequirements: z.string().max(8000).optional().or(z.literal("")),
  genres: optionalText(500),
  performanceFormats: optionalText(500),
  languages: optionalText(500),
  accessibilityNotes: optionalText(8000),
  equipmentSupplied: optionalText(8000),
  websiteUrl: softUrlField.optional().default(""),
  socialLinks: socialLinksSchema,
  contactEmail: z.string().trim().email().max(320),
  contactPhone: z.string().trim().max(32).optional().or(z.literal("")),
  locale: localeSchema,
});

const venueProductionField = optionalText(500);

const venueSchema = z.object({
  name: z.string().trim().min(1).max(160),
  shortDescription: z.string().trim().max(8000).optional().or(z.literal("")),
  addressLine1: z.string().trim().max(200).optional().or(z.literal("")),
  addressLine2: z.string().trim().max(200).optional(),
  district: z.string().trim().max(120).optional().or(z.literal("")),
  postalCode: z.string().trim().max(16).optional().or(z.literal("")),
  latitude: z.string().trim().max(32).optional(),
  longitude: z.string().trim().max(32).optional(),
  googlePlaceId: z.string().trim().max(256).optional().or(z.literal("")),
  venueType: z.string().trim().max(120).optional().or(z.literal("")),
  audienceDescription: z.string().trim().max(8000).optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1).max(100000).default(50),
  capacityContext: z.string().trim().max(500).optional(),
  roomName: z.string().trim().max(160).optional().or(z.literal("")),
  roomStageDimensions: z.string().trim().max(200).optional().or(z.literal("")),
  productionNotes: z.string().trim().max(8000).optional(),
  productionPa: venueProductionField,
  productionMixer: venueProductionField,
  productionMics: venueProductionField,
  productionLighting: venueProductionField,
  productionBackline: venueProductionField,
  productionPower: venueProductionField,
  productionStage: venueProductionField,
  houseRules: optionalText(8000),
  loadInNotes: optionalText(8000),
  accessibilityNotes: optionalText(8000),
  socialLinks: socialLinksSchema,
  websiteUrl: softUrlField.optional().default(""),
  contactEmail: z.string().trim().email().max(320),
  contactPhone: z.string().trim().max(32).optional().or(z.literal("")),
  locale: localeSchema,
});

function buildVenueProductionResources(
  data: z.infer<typeof venueSchema>,
): Record<string, string> {
  const notes = optionalNullableRichText(data.productionNotes, LONG_NOTES_MAX);
  const resources: Record<string, string> = {
    notes: notes ?? "",
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

function optionalNullableRichText(
  value: string | undefined,
  max: number,
): string | null {
  const check = validateRichTextField(value ?? "", {
    min: 0,
    max,
    allowEmpty: true,
  });
  if (!check.ok) {
    throw new AppError("validation", check.reason);
  }
  return check.value ? check.value : null;
}

function requireRichText(
  value: string | undefined,
  options: { min: number; max: number },
): string {
  const check = validateRichTextField(value ?? "", options);
  if (!check.ok) {
    throw new AppError("validation", check.reason);
  }
  return check.value;
}

function sanitizeVenueProse(data: z.infer<typeof venueSchema>) {
  return {
    shortDescription: requireRichText(data.shortDescription, {
      min: 0,
      max: SHORT_DESCRIPTION_MAX,
    }),
    audienceDescription: requireRichText(data.audienceDescription, {
      min: 0,
      max: NOTES_MAX,
    }),
    houseRules: optionalNullableRichText(data.houseRules, LONG_NOTES_MAX),
    loadInNotes: optionalNullableRichText(data.loadInNotes, LONG_NOTES_MAX),
    accessibilityNotes: optionalNullableRichText(
      data.accessibilityNotes,
      NOTES_MAX,
    ),
  };
}

function assertVenueReadyForPublish(venue: {
  name: string;
  shortDescription: string;
  addressLine1: string;
  district: string;
  postalCode: string;
  latitude: string | null;
  longitude: string | null;
  venueType: string;
  audienceDescription: string;
  capacity: number;
}) {
  if (!venue.name.trim()) {
    throw new AppError("validation", "Venue name is required");
  }
  const shortDescriptionCheck = validateRichTextField(venue.shortDescription, {
    min: DESCRIPTION_MIN,
    max: SHORT_DESCRIPTION_MAX,
  });
  if (!shortDescriptionCheck.ok) {
    throw new AppError("validation", shortDescriptionCheck.reason);
  }
  if (!venue.addressLine1.trim()) {
    throw new AppError("validation", "Address is required");
  }
  if (!venue.district.trim()) {
    throw new AppError("validation", "District is required");
  }
  if (!venue.postalCode.trim()) {
    throw new AppError("validation", "Postal code is required");
  }
  if (!venue.latitude?.trim() || !venue.longitude?.trim()) {
    throw new AppError(
      "validation",
      "Map coordinates are required (use Places search or enter them)",
    );
  }
  if (!venue.venueType.trim()) {
    throw new AppError("validation", "Venue type is required");
  }
  if (!Number.isFinite(venue.capacity) || venue.capacity < 1) {
    throw new AppError("validation", "Capacity is required");
  }
  const audienceCheck = validateRichTextField(venue.audienceDescription, {
    min: DESCRIPTION_MIN,
    max: NOTES_MAX,
  });
  if (!audienceCheck.ok) {
    throw new AppError("validation", audienceCheck.reason);
  }
}

export async function upsertEntertainerProfile(
  input: z.input<typeof entertainerSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor, auditUserId } = await requireActor();
    if (!can(actor, "entertainer.manage_own_profile")) {
      throw new AppError("forbidden", "Entertainer role required");
    }
    const ownerUserId = actor.userId;

    const parsed = entertainerSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid entertainer profile");
    }

    const actNameCheck = sanitizePlainText(parsed.data.actName, {
      min: 1,
      max: 160,
    });
    if (!actNameCheck.ok) {
      throw new AppError("validation", actNameCheck.reason);
    }
    const descriptionCheck = validateRichTextField(
      parsed.data.description ?? "",
      {
        min: 0,
        max: DESCRIPTION_MAX,
        allowEmpty: true,
      },
    );
    if (!descriptionCheck.ok) {
      throw new AppError("validation", descriptionCheck.reason);
    }
    const technicalCheck = validateRichTextField(
      parsed.data.technicalRequirements ?? "",
      { min: 0, max: TECHNICAL_MAX, allowEmpty: true },
    );
    if (!technicalCheck.ok) {
      throw new AppError("validation", technicalCheck.reason);
    }
    const locationCheck = sanitizePlainText(parsed.data.berlinBase ?? "", {
      allowEmpty: true,
      max: 300,
    });
    if (!locationCheck.ok) {
      throw new AppError("validation", locationCheck.reason);
    }
    if (
      parsed.data.priceMaxCents < parsed.data.priceMinCents &&
      parsed.data.priceMaxCents > 0
    ) {
      throw new AppError("validation", "Price max must be >= min");
    }

    const accessibilityNotes = optionalNullableRichText(
      parsed.data.accessibilityNotes,
      NOTES_MAX,
    );
    const equipmentSupplied = optionalNullableRichText(
      parsed.data.equipmentSupplied,
      NOTES_MAX,
    );

    const db = getDb();
    const existing = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.userId, ownerUserId),
    });

    const now = new Date();
    const values = {
      actName: actNameCheck.value,
      category: parsed.data.category?.trim() || "uncategorized",
      description: descriptionCheck.value || "",
      groupSize: parsed.data.groupSize,
      berlinBase: locationCheck.value || "",
      baseLatitude: parsed.data.baseLatitude?.trim() || null,
      baseLongitude: parsed.data.baseLongitude?.trim() || null,
      travelRadiusKm: parsed.data.travelRadiusKm,
      priceMinCents: parsed.data.priceMinCents,
      priceMaxCents: parsed.data.priceMaxCents,
      durationMinutes: parsed.data.durationMinutes,
      technicalRequirements: technicalCheck.value || "",
      genres: optionalNullableText(parsed.data.genres),
      performanceFormats: optionalNullableText(parsed.data.performanceFormats),
      languages: optionalNullableText(parsed.data.languages),
      accessibilityNotes,
      equipmentSupplied,
      websiteUrl: optionalNullableText(parsed.data.websiteUrl),
      socialLinks: compactSocialLinks(parsed.data.socialLinks),
      // Keep current publication state — edits do not unpublish.
      publicationState:
        (existing?.publicationState as ProfilePublicationState | undefined) ??
        "draft",
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
            userId: ownerUserId,
            ...values,
            currency: "EUR",
          })
          .returning();
        profileId = created?.id;
      }

      await upsertPreferredContact(tx, {
        ownerType: "entertainer",
        ownerId: profileId ?? ownerUserId,
        kind: "email",
        value: parsed.data.contactEmail,
      });

      if (parsed.data.contactPhone?.trim()) {
        await upsertPreferredContact(tx, {
          ownerType: "entertainer",
          ownerId: profileId ?? ownerUserId,
          kind: "phone",
          value: parsed.data.contactPhone.trim(),
        });
      }

      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: "entertainer_profile.upserted",
        subjectType: "entertainer_profile",
        subjectId: profileId ?? ownerUserId,
        metadata: {
          publicationState: values.publicationState,
          ...(ownerUserId !== auditUserId
            ? { supportSubjectUserId: ownerUserId }
            : {}),
        },
      });
    });
    return { ok: true, ...(profileId ? { id: profileId } : {}) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function publishEntertainerProfile(
  locale: "en" | "de" = "en",
): Promise<ActionResult> {
  try {
    const { actor, auditUserId } = await requireActor();
    if (!can(actor, "entertainer.manage_own_profile")) {
      throw new AppError("forbidden", "Entertainer role required");
    }

    const db = getDb();
    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.userId, actor.userId),
    });
    if (!profile) {
      throw new AppError("not_found", "Create a profile draft first");
    }

    const [imageRow] = await db
      .select({ value: count() })
      .from(portfolioItems)
      .where(
        and(
          eq(portfolioItems.entertainerProfileId, profile.id),
          eq(portfolioItems.kind, "image"),
        ),
      );

    const mediaLinks = await db.query.portfolioItems.findMany({
      where: eq(portfolioItems.entertainerProfileId, profile.id),
      columns: { kind: true },
    });
    const hasExternalOrVideoLink = mediaLinks.some(
      (item) => item.kind === "youtube" || item.kind === "link",
    );

    const readiness = checkEntertainerPublishReadiness({
      actName: profile.actName,
      category: profile.category,
      genres: profile.genres,
      description: profile.description,
      groupSize: profile.groupSize,
      berlinBase: profile.berlinBase,
      travelRadiusKm: profile.travelRadiusKm,
      priceMinCents: profile.priceMinCents,
      priceMaxCents: profile.priceMaxCents,
      websiteUrl: profile.websiteUrl,
      socialLinks:
        (profile.socialLinks as Record<string, string> | null) ?? null,
      imageCount: imageRow?.value ?? 0,
      hasExternalOrVideoLink,
    });
    if (!readiness.ok) {
      throw new AppError(
        "validation",
        readiness.reasons[0] ?? "Profile incomplete",
      );
    }

    const from = profile.publicationState as ProfilePublicationState;
    if (!canOwnerTransitionProfile(from, "approved")) {
      throw new AppError("invalid_transition", `Cannot publish from ${from}`);
    }

    await db.transaction(async (tx) => {
      await tx
        .update(entertainerProfiles)
        .set({ publicationState: "approved", updatedAt: new Date() })
        .where(eq(entertainerProfiles.id, profile.id));
      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: "entertainer_profile.published",
        subjectType: "entertainer_profile",
        subjectId: profile.id,
        metadata: { from, to: "approved" },
      });
    });

    revalidatePath(`/${locale}/profile`);
    revalidatePath(`/${locale}/marketplace`);
    revalidatePath("/", "layout");
    return { ok: true, id: profile.id };
  } catch (error) {
    return toActionError(error);
  }
}

/** @deprecated Use publishEntertainerProfile — kept for any lingering callers. */
export async function submitEntertainerProfile(
  locale: "en" | "de" = "en",
): Promise<ActionResult> {
  return publishEntertainerProfile(locale);
}

export async function unpublishEntertainerProfile(
  locale: "en" | "de" = "en",
): Promise<ActionResult> {
  try {
    const { actor, auditUserId } = await requireActor();
    if (!can(actor, "entertainer.manage_own_profile")) {
      throw new AppError("forbidden", "Entertainer role required");
    }

    const db = getDb();
    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.userId, actor.userId),
    });
    if (!profile) {
      throw new AppError("not_found", "Profile not found");
    }

    const from = profile.publicationState as ProfilePublicationState;
    if (!canOwnerTransitionProfile(from, "draft")) {
      throw new AppError("invalid_transition", `Cannot unpublish from ${from}`);
    }

    await db.transaction(async (tx) => {
      await tx
        .update(entertainerProfiles)
        .set({ publicationState: "draft", updatedAt: new Date() })
        .where(eq(entertainerProfiles.id, profile.id));
      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: "entertainer_profile.unpublished",
        subjectType: "entertainer_profile",
        subjectId: profile.id,
        metadata: { from, to: "draft" },
      });
    });

    revalidatePath(`/${locale}/profile`);
    revalidatePath(`/${locale}/marketplace`);
    return { ok: true, id: profile.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createVenue(
  input: z.input<typeof venueSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor, auditUserId } = await requireActor();
    if (!can(actor, "venue.create")) {
      throw new AppError("forbidden", "Venue role required");
    }

    const parsed = venueSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid venue profile");
    }

    const db = getDb();
    const existing = await db.query.venues.findFirst({
      where: eq(venues.ownerUserId, actor.userId),
      columns: { id: true },
    });
    if (existing) {
      throw new AppError(
        "conflict",
        "This account already has a venue profile",
      );
    }

    const prose = sanitizeVenueProse(parsed.data);
    const now = new Date();
    let venueId: string | undefined;

    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(venues)
        .values({
          ownerUserId: actor.userId,
          name: parsed.data.name,
          shortDescription: prose.shortDescription,
          addressLine1: parsed.data.addressLine1 ?? "",
          ...(parsed.data.addressLine2
            ? { addressLine2: parsed.data.addressLine2 }
            : {}),
          district: parsed.data.district ?? "",
          postalCode: parsed.data.postalCode ?? "",
          ...(parsed.data.latitude ? { latitude: parsed.data.latitude } : {}),
          ...(parsed.data.longitude
            ? { longitude: parsed.data.longitude }
            : {}),
          ...(parsed.data.googlePlaceId
            ? { googlePlaceId: parsed.data.googlePlaceId }
            : {}),
          venueType: parsed.data.venueType ?? "",
          audienceDescription: prose.audienceDescription,
          capacity: parsed.data.capacity,
          ...(parsed.data.capacityContext
            ? { capacityContext: parsed.data.capacityContext }
            : {}),
          productionResources: buildVenueProductionResources(parsed.data),
          houseRules: prose.houseRules,
          loadInNotes: prose.loadInNotes,
          accessibilityNotes: prose.accessibilityNotes,
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

      await tx.insert(venueSpaces).values({
        venueId: created.id,
        name: parsed.data.roomName?.trim() || `${created.name} — Main room`,
        capacity: created.capacity,
        productionResources: {},
      });

      await upsertPreferredContact(tx, {
        ownerType: "venue",
        ownerId: created.id,
        kind: "email",
        value: parsed.data.contactEmail,
      });

      if (parsed.data.contactPhone?.trim()) {
        await upsertPreferredContact(tx, {
          ownerType: "venue",
          ownerId: created.id,
          kind: "phone",
          value: parsed.data.contactPhone.trim(),
        });
      }

      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: "venue.created",
        subjectType: "venue",
        subjectId: created.id,
        metadata: { publicationState: "draft" },
      });
    });

    // Autosave owns client form state — do not revalidate /profile (avoids RSC remount).
    return { ok: true, ...(venueId ? { id: venueId } : {}) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateVenue(
  venueId: string,
  input: z.input<typeof venueSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor, auditUserId } = await requireActor();
    const allowed = can(actor, "venue.manage", { venueId });
    if (!allowed) {
      throw new AppError("forbidden", "Venue owner required");
    }

    const parsed = venueSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid venue profile");
    }

    const prose = sanitizeVenueProse(parsed.data);
    const db = getDb();
    const existing = await db.query.venues.findFirst({
      where: eq(venues.id, venueId),
    });
    if (!existing) {
      throw new AppError("not_found", "Venue not found");
    }

    const nextState: ProfilePublicationState =
      (existing.publicationState as ProfilePublicationState) ?? "draft";

    await db.transaction(async (tx) => {
      await tx
        .update(venues)
        .set({
          name: parsed.data.name,
          shortDescription: prose.shortDescription,
          addressLine1: parsed.data.addressLine1 ?? "",
          addressLine2: parsed.data.addressLine2 ?? null,
          district: parsed.data.district ?? "",
          postalCode: parsed.data.postalCode ?? "",
          latitude: parsed.data.latitude ?? null,
          longitude: parsed.data.longitude ?? null,
          googlePlaceId: parsed.data.googlePlaceId?.trim() || null,
          venueType: parsed.data.venueType ?? "",
          audienceDescription: prose.audienceDescription,
          capacity: parsed.data.capacity,
          capacityContext: parsed.data.capacityContext ?? null,
          productionResources: buildVenueProductionResources(parsed.data),
          houseRules: prose.houseRules,
          loadInNotes: prose.loadInNotes,
          accessibilityNotes: prose.accessibilityNotes,
          socialLinks: compactSocialLinks(parsed.data.socialLinks),
          websiteUrl: parsed.data.websiteUrl || null,
          publicationState: nextState,
          updatedAt: new Date(),
        })
        .where(eq(venues.id, venueId));

      const spaces = await tx
        .select({ id: venueSpaces.id })
        .from(venueSpaces)
        .where(eq(venueSpaces.venueId, venueId))
        .orderBy(asc(venueSpaces.createdAt))
        .limit(1);
      const primarySpace = spaces[0];
      if (primarySpace) {
        await tx
          .update(venueSpaces)
          .set({
            name:
              parsed.data.roomName?.trim() || `${parsed.data.name} — Main room`,
            capacity: parsed.data.capacity,
            stageDimensions: parsed.data.roomStageDimensions?.trim() || null,
            updatedAt: new Date(),
          })
          .where(eq(venueSpaces.id, primarySpace.id));
      }

      await upsertPreferredContact(tx, {
        ownerType: "venue",
        ownerId: venueId,
        kind: "email",
        value: parsed.data.contactEmail,
      });

      if (parsed.data.contactPhone?.trim()) {
        await upsertPreferredContact(tx, {
          ownerType: "venue",
          ownerId: venueId,
          kind: "phone",
          value: parsed.data.contactPhone.trim(),
        });
      }

      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: "venue.updated",
        subjectType: "venue",
        subjectId: venueId,
        metadata: { publicationState: nextState },
      });
    });

    // Autosave owns client form state — do not revalidate profile routes.
    return { ok: true, id: venueId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function publishVenueProfile(
  venueId: string,
  locale: "en" | "de" = "en",
): Promise<ActionResult> {
  try {
    const { actor, auditUserId } = await requireActor();
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

    assertVenueReadyForPublish(venue);

    const from = venue.publicationState as ProfilePublicationState;
    if (!canOwnerTransitionProfile(from, "approved")) {
      throw new AppError("invalid_transition", `Cannot publish from ${from}`);
    }

    if (!venue.ownerUserId) {
      throw new AppError("validation", "Venue requires an active owner");
    }

    await db.transaction(async (tx) => {
      await tx
        .update(venues)
        .set({ publicationState: "approved", updatedAt: new Date() })
        .where(eq(venues.id, venueId));
      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: "venue.published",
        subjectType: "venue",
        subjectId: venueId,
        metadata: { from, to: "approved" },
      });
    });

    revalidatePath(`/${locale}/profile`);
    revalidatePath(`/${locale}/profile/venues/${venueId}`);
    revalidatePath(`/${locale}/marketplace`);
    revalidatePath("/", "layout");
    return { ok: true, id: venueId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function unpublishVenueProfile(
  venueId: string,
  locale: "en" | "de" = "en",
): Promise<ActionResult> {
  try {
    const { actor, auditUserId } = await requireActor();
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
    if (!canOwnerTransitionProfile(from, "draft")) {
      throw new AppError("invalid_transition", `Cannot unpublish from ${from}`);
    }

    await db.transaction(async (tx) => {
      await tx
        .update(venues)
        .set({ publicationState: "draft", updatedAt: new Date() })
        .where(eq(venues.id, venueId));
      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: "venue.unpublished",
        subjectType: "venue",
        subjectId: venueId,
        metadata: { from, to: "draft" },
      });
    });

    revalidatePath(`/${locale}/profile`);
    revalidatePath(`/${locale}/profile/venues/${venueId}`);
    revalidatePath(`/${locale}/marketplace`);
    return { ok: true, id: venueId };
  } catch (error) {
    return toActionError(error);
  }
}

/** @deprecated Use publishVenueProfile. */
export async function submitVenueProfile(
  venueId: string,
  locale: "en" | "de" = "en",
): Promise<ActionResult> {
  return publishVenueProfile(venueId, locale);
}

const venueSpaceSchema = z.object({
  venueId: z.string().uuid(),
  spaceId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  capacity: z.coerce.number().int().min(1).max(100000),
  stageDimensions: optionalText(200),
  accessibilityNotes: optionalText(8000),
  locale: localeSchema,
});

export async function upsertVenueSpace(
  input: z.infer<typeof venueSpaceSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor, auditUserId } = await requireActor();
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
      accessibilityNotes: optionalNullableRichText(
        parsed.data.accessibilityNotes,
        NOTES_MAX,
      ),
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
      const existingSpaces = await db
        .select({ id: venueSpaces.id })
        .from(venueSpaces)
        .where(eq(venueSpaces.venueId, parsed.data.venueId))
        .limit(1);
      if (existingSpaces[0]) {
        throw new AppError(
          "conflict",
          "This venue already has its one room. Edit the existing room instead.",
        );
      }
      const [created] = await db
        .insert(venueSpaces)
        .values({ ...values, createdAt: now })
        .returning();
      spaceId = created?.id;
    }

    await db.insert(auditEvents).values({
      actorUserId: auditUserId,
      action: parsed.data.spaceId
        ? "venue_space.updated"
        : "venue_space.created",
      subjectType: "venue_space",
      subjectId: spaceId ?? parsed.data.venueId,
      metadata: { venueId: parsed.data.venueId },
    });

    revalidatePath(`/${parsed.data.locale}/profile`);
    return { ok: true, ...(spaceId ? { id: spaceId } : {}) };
  } catch (error) {
    return toActionError(error);
  }
}
