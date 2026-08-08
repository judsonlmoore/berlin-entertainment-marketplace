import { db } from "@/src/db/client";
import { entertainerProfiles, venues } from "@/src/db/schema/marketplace";
import { sql } from "drizzle-orm";

/**
 * Get count of approved (published) members in the marketplace.
 * Returns null if query fails or no members exist.
 * Used for public landing page social proof.
 */
export async function getApprovedMemberCount(): Promise<number | null> {
  try {
    // Count approved entertainer profiles
    const [entertainersResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(entertainerProfiles)
      .where(sql`${entertainerProfiles.publicationState} = 'approved'`);

    // Count approved venue profiles
    const [venuesResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(venues)
      .where(sql`${venues.publicationState} = 'approved'`);

    const entertainersCount = entertainersResult?.count ?? 0;
    const venuesCount = venuesResult?.count ?? 0;
    const total = entertainersCount + venuesCount;

    return total > 0 ? total : null;
  } catch (error) {
    console.error("Failed to fetch member count:", error);
    return null;
  }
}
