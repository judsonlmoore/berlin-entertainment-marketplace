import { desc, eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { users } from "@/src/db/schema";
import {
  entertainerProfiles,
  portfolioItems,
  venueSpaces,
  venues,
} from "@/src/db/schema/marketplace";

export async function getEntertainerProfileForUser(userId: string) {
  const db = getDb();
  return db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.userId, userId),
  });
}

export async function listPortfolioItemsForProfile(
  entertainerProfileId: string,
) {
  const db = getDb();
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
    .orderBy(portfolioItems.sortOrder, portfolioItems.createdAt);
}

export async function listPortfolioItemsForVenue(venueId: string) {
  const db = getDb();
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
    .where(eq(portfolioItems.venueId, venueId))
    .orderBy(portfolioItems.sortOrder, portfolioItems.createdAt);
}

export async function listVenueSpaces(venueId: string) {
  const db = getDb();
  return db
    .select({
      id: venueSpaces.id,
      name: venueSpaces.name,
      capacity: venueSpaces.capacity,
      stageDimensions: venueSpaces.stageDimensions,
      accessibilityNotes: venueSpaces.accessibilityNotes,
      productionResources: venueSpaces.productionResources,
    })
    .from(venueSpaces)
    .where(eq(venueSpaces.venueId, venueId))
    .orderBy(venueSpaces.name);
}

export async function getVenueForOwnerView(venueId: string) {
  const db = getDb();
  return db.query.venues.findFirst({
    where: eq(venues.id, venueId),
  });
}

export async function listVenuesForUser(userId: string) {
  const db = getDb();
  return db
    .select({
      id: venues.id,
      name: venues.name,
      publicationState: venues.publicationState,
      district: venues.district,
    })
    .from(venues)
    .where(eq(venues.ownerUserId, userId))
    .orderBy(desc(venues.updatedAt));
}

export async function listProfilesForStaffReview() {
  const db = getDb();
  const [entertainers, venueRows] = await Promise.all([
    db
      .select({
        id: entertainerProfiles.id,
        title: entertainerProfiles.actName,
        publicationState: entertainerProfiles.publicationState,
        ownerName: users.name,
        ownerEmail: users.email,
        updatedAt: entertainerProfiles.updatedAt,
      })
      .from(entertainerProfiles)
      .innerJoin(users, eq(users.id, entertainerProfiles.userId))
      .orderBy(desc(entertainerProfiles.updatedAt)),
    db
      .select({
        id: venues.id,
        title: venues.name,
        publicationState: venues.publicationState,
        district: venues.district,
        updatedAt: venues.updatedAt,
      })
      .from(venues)
      .orderBy(desc(venues.updatedAt)),
  ]);

  return {
    entertainers: entertainers.map((row) => ({
      id: row.id,
      type: "entertainer" as const,
      title: row.title,
      publicationState: row.publicationState,
      ownerName: row.ownerName,
      ownerEmail: row.ownerEmail,
      updatedAt: row.updatedAt,
    })),
    venues: venueRows.map((row) => ({
      id: row.id,
      type: "venue" as const,
      title: row.title,
      publicationState: row.publicationState,
      district: row.district,
      updatedAt: row.updatedAt,
    })),
  };
}
