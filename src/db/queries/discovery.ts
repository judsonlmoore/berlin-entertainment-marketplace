import { and, asc, count, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  contactMethods,
  contactUnlocks,
  entertainerProfiles,
  portfolioItems,
  venues,
} from "@/src/db/schema/marketplace";
import {
  projectContactMethods,
  type RevealedContact,
  type StoredContactMethod,
} from "@/src/domain/contact-projection";

/** True when an image row can be served via /api/portfolio/[id]. */
export function isServablePortfolioImageKey(
  blobKey: string | null | undefined,
): boolean {
  if (!blobKey) return false;
  return (
    blobKey.startsWith("local/") ||
    blobKey.startsWith("blob/") ||
    blobKey.startsWith("memory/")
  );
}

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
  /** First servable portfolio image id for card thumbnails, if any. */
  heroImageId: string | null;
};

export type PortfolioDiscoveryItem = {
  id: string;
  kind: "image" | "link" | "youtube";
  caption: string | null;
  altText: string | null;
  url: string | null;
  /** Present for image rows — used to skip unsavable legacy keys. */
  blobKey?: string | null;
  sortOrder: number;
};

export type EntertainerDiscoveryDetail = EntertainerDiscoveryCard & {
  userId: string;
  technicalRequirements: string;
  genres: string | null;
  performanceFormats: string | null;
  languages: string | null;
  accessibilityNotes: string | null;
  equipmentSupplied: string | null;
  websiteUrl: string | null;
  socialLinks: Record<string, string>;
  contacts: RevealedContact[] | null;
  contactLocked: boolean;
  portfolio: PortfolioDiscoveryItem[] | null;
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
  houseRules: string | null;
  loadInNotes: string | null;
  accessibilityNotes: string | null;
  websiteUrl: string | null;
  socialLinks: Record<string, string>;
  contacts: RevealedContact[] | null;
  contactLocked: boolean;
};

export type EntertainerFilters = {
  q?: string;
  category?: string;
  berlinBase?: string;
  groupSizeMin?: number;
  groupSizeMax?: number;
  priceMinCents?: number;
  priceMaxCents?: number;
};

export type VenueFilters = {
  q?: string;
  district?: string;
  venueType?: string;
  capacityMin?: number;
  capacityMax?: number;
};

export type DiscoveryPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

function asStoredContacts(
  rows: {
    id: string;
    kind: "email" | "phone" | "other";
    value: string;
    isPreferred: boolean;
  }[],
): StoredContactMethod[] {
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    value: row.value,
    isPreferred: row.isPreferred,
  }));
}

async function listUnlockedContactMethodIds(input: {
  viewerUserId: string;
  entertainerProfileId?: string;
  venueId?: string;
}): Promise<string[]> {
  const db = getDb();

  if (input.entertainerProfileId) {
    const rows = await db
      .select({ id: contactUnlocks.contactMethodId })
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
      );
    return rows.map((row) => row.id);
  }

  if (input.venueId) {
    const rows = await db
      .select({ id: contactUnlocks.contactMethodId })
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
      );
    return rows.map((row) => row.id);
  }

  return [];
}

function entertainerFilterConditions(filters: EntertainerFilters) {
  const conditions = [eq(entertainerProfiles.publicationState, "approved")];

  if (filters.q) {
    const term = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(entertainerProfiles.actName, term),
        ilike(entertainerProfiles.category, term),
        ilike(entertainerProfiles.description, term),
        ilike(entertainerProfiles.berlinBase, term),
      )!,
    );
  }
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

  return and(...conditions);
}

function venueFilterConditions(filters: VenueFilters) {
  const conditions = [eq(venues.publicationState, "approved")];

  if (filters.q) {
    const term = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(venues.name, term),
        ilike(venues.district, term),
        ilike(venues.venueType, term),
        ilike(venues.shortDescription, term),
      )!,
    );
  }
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

  return and(...conditions);
}

function normalizePage(page?: number, pageSize = 12) {
  const safePage = Math.max(1, page ?? 1);
  const safeSize = Math.min(48, Math.max(1, pageSize));
  return {
    page: safePage,
    pageSize: safeSize,
    offset: (safePage - 1) * safeSize,
  };
}

export async function listDiscoverableEntertainers(
  filters: EntertainerFilters = {},
  options: { page?: number; pageSize?: number } = {},
): Promise<DiscoveryPage<EntertainerDiscoveryCard>> {
  const db = getDb();
  const where = entertainerFilterConditions(filters);
  const { page, pageSize, offset } = normalizePage(
    options.page,
    options.pageSize ?? 12,
  );

  const [totalRow] = await db
    .select({ value: count() })
    .from(entertainerProfiles)
    .where(where);

  const items = await db
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
    .where(where)
    .orderBy(entertainerProfiles.actName)
    .limit(pageSize)
    .offset(offset);

  const heroByProfile = await loadHeroImageIds(items.map((row) => row.id));
  const total = totalRow?.value ?? 0;
  return {
    items: items.map((row) => ({
      ...row,
      heroImageId: heroByProfile.get(row.id) ?? null,
    })),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * First servable portfolio image id per entertainer profile (batched).
 */
async function loadHeroImageIds(
  profileIds: string[],
): Promise<Map<string, string>> {
  const heroes = new Map<string, string>();
  if (profileIds.length === 0) return heroes;

  const db = getDb();
  const rows = await db
    .select({
      profileId: portfolioItems.entertainerProfileId,
      id: portfolioItems.id,
      blobKey: portfolioItems.blobKey,
    })
    .from(portfolioItems)
    .where(
      and(
        inArray(portfolioItems.entertainerProfileId, profileIds),
        eq(portfolioItems.kind, "image"),
      ),
    )
    .orderBy(asc(portfolioItems.sortOrder), asc(portfolioItems.createdAt));

  for (const row of rows) {
    if (heroes.has(row.profileId)) continue;
    if (isServablePortfolioImageKey(row.blobKey)) {
      heroes.set(row.profileId, row.id);
    }
  }
  return heroes;
}

export async function listDiscoverableVenues(
  filters: VenueFilters = {},
  options: { page?: number; pageSize?: number } = {},
): Promise<DiscoveryPage<VenueDiscoveryCard>> {
  const db = getDb();
  const where = venueFilterConditions(filters);
  const { page, pageSize, offset } = normalizePage(
    options.page,
    options.pageSize ?? 12,
  );

  const [totalRow] = await db
    .select({ value: count() })
    .from(venues)
    .where(where);

  const items = await db
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
    .where(where)
    .orderBy(venues.name)
    .limit(pageSize)
    .offset(offset);

  const total = totalRow?.value ?? 0;
  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listEntertainerCategoryFacets(limit = 8) {
  const db = getDb();
  const rows = await db
    .select({
      category: entertainerProfiles.category,
      value: count(),
    })
    .from(entertainerProfiles)
    .where(eq(entertainerProfiles.publicationState, "approved"))
    .groupBy(entertainerProfiles.category)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
  return rows.map((row) => row.category).filter(Boolean);
}

export async function getDiscoverableEntertainerDetail(input: {
  entertainerProfileId: string;
  viewerUserId: string;
  includePortfolio?: boolean;
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
      value: contactMethods.value,
      isPreferred: contactMethods.isPreferred,
    })
    .from(contactMethods)
    .where(
      and(
        eq(contactMethods.ownerType, "entertainer"),
        eq(contactMethods.ownerId, profile.id),
      ),
    );

  const unlockedMethodIds = await listUnlockedContactMethodIds({
    viewerUserId: input.viewerUserId,
    entertainerProfileId: profile.id,
  });
  const contacts = projectContactMethods(
    asStoredContacts(methods),
    unlockedMethodIds,
  );
  const unlocked = unlockedMethodIds.length > 0;

  let portfolio: PortfolioDiscoveryItem[] | null = null;
  if (input.includePortfolio) {
    portfolio = await db
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
      .where(eq(portfolioItems.entertainerProfileId, profile.id))
      .orderBy(portfolioItems.sortOrder, portfolioItems.createdAt);
  }

  const heroImageId =
    portfolio?.find(
      (item) =>
        item.kind === "image" && isServablePortfolioImageKey(item.blobKey),
    )?.id ?? null;

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
    heroImageId,
    technicalRequirements: profile.technicalRequirements,
    genres: profile.genres,
    performanceFormats: profile.performanceFormats,
    languages: profile.languages,
    accessibilityNotes: profile.accessibilityNotes,
    equipmentSupplied: profile.equipmentSupplied,
    websiteUrl: profile.websiteUrl,
    socialLinks: profile.socialLinks ?? {},
    contacts,
    contactLocked: !unlocked,
    portfolio,
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
      value: contactMethods.value,
      isPreferred: contactMethods.isPreferred,
    })
    .from(contactMethods)
    .where(
      and(
        eq(contactMethods.ownerType, "venue"),
        eq(contactMethods.ownerId, venue.id),
      ),
    );

  const unlockedMethodIds = await listUnlockedContactMethodIds({
    viewerUserId: input.viewerUserId,
    venueId: venue.id,
  });
  const contacts = projectContactMethods(
    asStoredContacts(methods),
    unlockedMethodIds,
  );
  const unlocked = unlockedMethodIds.length > 0;

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
    houseRules: venue.houseRules,
    loadInNotes: venue.loadInNotes,
    accessibilityNotes: venue.accessibilityNotes,
    websiteUrl: venue.websiteUrl,
    socialLinks: venue.socialLinks ?? {},
    contacts,
    contactLocked: !unlocked,
  };
}
