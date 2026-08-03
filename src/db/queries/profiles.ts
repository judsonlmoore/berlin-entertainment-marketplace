import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { users } from "@/src/db/schema";
import {
  entertainerProfiles,
  venueMemberships,
  venues,
} from "@/src/db/schema/marketplace";

export async function getEntertainerProfileForUser(userId: string) {
  const db = getDb();
  return db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.userId, userId),
  });
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
      role: venueMemberships.role,
      membershipStatus: venueMemberships.status,
    })
    .from(venueMemberships)
    .innerJoin(venues, eq(venues.id, venueMemberships.venueId))
    .where(
      and(
        eq(venueMemberships.userId, userId),
        eq(venueMemberships.status, "active"),
      ),
    )
    .orderBy(desc(venues.updatedAt));
}

export async function listVenueMembers(venueId: string) {
  const db = getDb();
  return db
    .select({
      id: venueMemberships.id,
      userId: venueMemberships.userId,
      role: venueMemberships.role,
      status: venueMemberships.status,
      name: users.name,
      email: users.email,
    })
    .from(venueMemberships)
    .innerJoin(users, eq(users.id, venueMemberships.userId))
    .where(eq(venueMemberships.venueId, venueId))
    .orderBy(venueMemberships.createdAt);
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
