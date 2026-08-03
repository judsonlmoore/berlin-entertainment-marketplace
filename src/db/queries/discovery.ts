import { and, eq, gte, ilike, lte } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  contactMethods,
  contactUnlocks,
  entertainerProfiles,
  venues,
} from "@/src/db/schema/marketplace";
import {
  projectContactMethods,
  type RevealedContact,
  type StoredContactMethod,
} from "@/src/domain/contact-projection";

export type EntertainerDiscoveryCard = {
  id: string;
  actName: string;
  category: string;
  description: string;
  groupSize: number;
  berlinBase: string;
  travelRadiusKm: number;
  priceMinCents: number;
  priceMaxCents: number;
  currency: string;
  durationMinutes: number;
};

export type EntertainerDiscoveryDetail = EntertainerDiscoveryCard & {
  userId: string;
  technicalRequirements: string;
  contacts: RevealedContact[] | null;
  contactLocked: boolean;
};

export type VenueDiscoveryCard = {
  id: string;
  name: string;
  shortDescription: string;
  district: string;
  venueType: string;
  audienceDescription: string;
  capacity: number;
  capacityContext: string | null;
};

export type VenueDiscoveryDetail = VenueDiscoveryCard & {
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string;
  city: string;
  latitude: string | null;
  longitude: string | null;
  productionResources: Record<string, unknown>;
  websiteUrl: string | null;
  contacts: RevealedContact[] | null;
  contactLocked: boolean;
};

export type EntertainerFilters = {
  category?: string;
  berlinBase?: string;
  groupSizeMin?: number;
  groupSizeMax?: number;
  priceMinCents?: number;
  priceMaxCents?: number;
};

export type VenueFilters = {
  district?: string;
  venueType?: string;
  capacityMin?: number;
  capacityMax?: number;
};

function asStoredContacts(
  rows: {
    id: string;
    kind: "email" | "phone" | "other";
    valueEncrypted: string;
    isPreferred: boolean;
  }[],
): StoredContactMethod[] {
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    valueEncrypted: row.valueEncrypted,
    isPreferred: row.isPreferred,
  }));
}

export async function listDiscoverableEntertainers(
  filters: EntertainerFilters = {},
): Promise<EntertainerDiscoveryCard[]> {
  const db = getDb();
  const conditions = [eq(entertainerProfiles.publicationState, "approved")];

  if (filters.category) {
    conditions.push(
      ilike(entertainerProfiles.category, `%${filters.category}%`),
    );
  }
  if (filters.berlinBase) {
    conditions.push(
      ilike(entertainerProfiles.berlinBase, `%${filters.berlinBase}%`),
    );
  }
  if (typeof filters.groupSizeMin === "number") {
    conditions.push(gte(entertainerProfiles.groupSize, filters.groupSizeMin));
  }
  if (typeof filters.groupSizeMax === "number") {
    conditions.push(lte(entertainerProfiles.groupSize, filters.groupSizeMax));
  }
  if (typeof filters.priceMinCents === "number") {
    conditions.push(
      gte(entertainerProfiles.priceMaxCents, filters.priceMinCents),
    );
  }
  if (typeof filters.priceMaxCents === "number") {
    conditions.push(
      lte(entertainerProfiles.priceMinCents, filters.priceMaxCents),
    );
  }

  const rows = await db
    .select({
      id: entertainerProfiles.id,
      actName: entertainerProfiles.actName,
      category: entertainerProfiles.category,
      description: entertainerProfiles.description,
      groupSize: entertainerProfiles.groupSize,
      berlinBase: entertainerProfiles.berlinBase,
      travelRadiusKm: entertainerProfiles.travelRadiusKm,
      priceMinCents: entertainerProfiles.priceMinCents,
      priceMaxCents: entertainerProfiles.priceMaxCents,
      currency: entertainerProfiles.currency,
      durationMinutes: entertainerProfiles.durationMinutes,
    })
    .from(entertainerProfiles)
    .where(and(...conditions))
    .orderBy(entertainerProfiles.actName);

  return rows;
}

export async function listDiscoverableVenues(
  filters: VenueFilters = {},
): Promise<VenueDiscoveryCard[]> {
  const db = getDb();
  const conditions = [eq(venues.publicationState, "approved")];

  if (filters.district) {
    conditions.push(ilike(venues.district, `%${filters.district}%`));
  }
  if (filters.venueType) {
    conditions.push(ilike(venues.venueType, `%${filters.venueType}%`));
  }
  if (typeof filters.capacityMin === "number") {
    conditions.push(gte(venues.capacity, filters.capacityMin));
  }
  if (typeof filters.capacityMax === "number") {
    conditions.push(lte(venues.capacity, filters.capacityMax));
  }

  return db
    .select({
      id: venues.id,
      name: venues.name,
      shortDescription: venues.shortDescription,
      district: venues.district,
      venueType: venues.venueType,
      audienceDescription: venues.audienceDescription,
      capacity: venues.capacity,
      capacityContext: venues.capacityContext,
    })
    .from(venues)
    .where(and(...conditions))
    .orderBy(venues.name);
}

async function hasContactUnlockForViewer(input: {
  viewerUserId: string;
  entertainerProfileId?: string;
  venueId?: string;
}): Promise<boolean> {
  const db = getDb();

  if (input.entertainerProfileId) {
    const [row] = await db
      .select({ id: contactUnlocks.id })
      .from(contactUnlocks)
      .innerJoin(
        contactMethods,
        eq(contactMethods.id, contactUnlocks.contactMethodId),
      )
      .where(
        and(
          eq(contactUnlocks.unlockedForUserId, input.viewerUserId),
          eq(contactMethods.ownerType, "entertainer"),
          eq(contactMethods.ownerId, input.entertainerProfileId),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  if (input.venueId) {
    const [row] = await db
      .select({ id: contactUnlocks.id })
      .from(contactUnlocks)
      .innerJoin(
        contactMethods,
        eq(contactMethods.id, contactUnlocks.contactMethodId),
      )
      .where(
        and(
          eq(contactUnlocks.unlockedForUserId, input.viewerUserId),
          eq(contactMethods.ownerType, "venue"),
          eq(contactMethods.ownerId, input.venueId),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  return false;
}

export async function getDiscoverableEntertainerDetail(input: {
  entertainerProfileId: string;
  viewerUserId: string;
}): Promise<EntertainerDiscoveryDetail | null> {
  const db = getDb();
  const profile = await db.query.entertainerProfiles.findFirst({
    where: and(
      eq(entertainerProfiles.id, input.entertainerProfileId),
      eq(entertainerProfiles.publicationState, "approved"),
    ),
  });
  if (!profile) {
    return null;
  }

  const methods = await db
    .select({
      id: contactMethods.id,
      kind: contactMethods.kind,
      valueEncrypted: contactMethods.valueEncrypted,
      isPreferred: contactMethods.isPreferred,
    })
    .from(contactMethods)
    .where(
      and(
        eq(contactMethods.ownerType, "entertainer"),
        eq(contactMethods.ownerId, profile.id),
      ),
    );

  const unlocked = await hasContactUnlockForViewer({
    viewerUserId: input.viewerUserId,
    entertainerProfileId: profile.id,
  });
  const contacts = projectContactMethods(asStoredContacts(methods), unlocked);

  return {
    id: profile.id,
    userId: profile.userId,
    actName: profile.actName,
    category: profile.category,
    description: profile.description,
    groupSize: profile.groupSize,
    berlinBase: profile.berlinBase,
    travelRadiusKm: profile.travelRadiusKm,
    priceMinCents: profile.priceMinCents,
    priceMaxCents: profile.priceMaxCents,
    currency: profile.currency,
    durationMinutes: profile.durationMinutes,
    technicalRequirements: profile.technicalRequirements,
    contacts,
    contactLocked: !unlocked,
  };
}

export async function getDiscoverableVenueDetail(input: {
  venueId: string;
  viewerUserId: string;
}): Promise<VenueDiscoveryDetail | null> {
  const db = getDb();
  const venue = await db.query.venues.findFirst({
    where: and(
      eq(venues.id, input.venueId),
      eq(venues.publicationState, "approved"),
    ),
  });
  if (!venue) {
    return null;
  }

  const methods = await db
    .select({
      id: contactMethods.id,
      kind: contactMethods.kind,
      valueEncrypted: contactMethods.valueEncrypted,
      isPreferred: contactMethods.isPreferred,
    })
    .from(contactMethods)
    .where(
      and(
        eq(contactMethods.ownerType, "venue"),
        eq(contactMethods.ownerId, venue.id),
      ),
    );

  const unlocked = await hasContactUnlockForViewer({
    viewerUserId: input.viewerUserId,
    venueId: venue.id,
  });
  const contacts = projectContactMethods(asStoredContacts(methods), unlocked);

  return {
    id: venue.id,
    name: venue.name,
    shortDescription: venue.shortDescription,
    district: venue.district,
    venueType: venue.venueType,
    audienceDescription: venue.audienceDescription,
    capacity: venue.capacity,
    capacityContext: venue.capacityContext,
    addressLine1: venue.addressLine1,
    addressLine2: venue.addressLine2,
    postalCode: venue.postalCode,
    city: venue.city,
    latitude: venue.latitude,
    longitude: venue.longitude,
    productionResources:
      (venue.productionResources as Record<string, unknown>) ?? {},
    websiteUrl: venue.websiteUrl,
    contacts,
    contactLocked: !unlocked,
  };
}
