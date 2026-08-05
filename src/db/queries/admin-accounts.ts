import { and, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { users } from "@/src/db/schema";
import {
  entertainerProfiles,
  marketplaceAccounts,
  userRoles,
  venueMemberships,
  venues,
} from "@/src/db/schema/marketplace";

export type AdminAccountSearchHit = {
  userId: string;
  name: string | null;
  email: string | null;
  accountStatus: string | null;
  role: "entertainer" | "venue" | null;
  isPlatformStaff: boolean;
  entertainer: {
    id: string;
    actName: string;
    publicationState: string;
  } | null;
  venues: {
    id: string;
    name: string;
    publicationState: string;
    membershipRole: string;
  }[];
};

/**
 * Staff search across member accounts, act names, and venue names.
 */
export async function searchAdminAccounts(
  query: string,
  limit = 40,
): Promise<AdminAccountSearchHit[]> {
  const db = getDb();
  const q = query.trim();
  if (q.length < 2) return [];

  const pattern = `%${q.replace(/[%_]/g, "\\$&")}%`;

  const matchingUserIds = new Set<string>();

  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(
      or(
        ilike(users.email, pattern),
        ilike(users.name, pattern),
        sql`${users.id}::text ilike ${pattern}`,
      ),
    )
    .limit(limit);

  for (const row of userRows) matchingUserIds.add(row.id);

  const actRows = await db
    .select({ userId: entertainerProfiles.userId })
    .from(entertainerProfiles)
    .where(ilike(entertainerProfiles.actName, pattern))
    .limit(limit);

  for (const row of actRows) matchingUserIds.add(row.userId);

  const venueOwnerRows = await db
    .select({ userId: venueMemberships.userId })
    .from(venues)
    .innerJoin(
      venueMemberships,
      and(
        eq(venueMemberships.venueId, venues.id),
        eq(venueMemberships.status, "active"),
        eq(venueMemberships.role, "owner"),
      ),
    )
    .where(ilike(venues.name, pattern))
    .limit(limit);

  for (const row of venueOwnerRows) matchingUserIds.add(row.userId);

  if (matchingUserIds.size === 0) return [];

  const ids = [...matchingUserIds].slice(0, limit);

  const hits: AdminAccountSearchHit[] = [];

  for (const userId of ids) {
    const [user, account, roleRow, entertainer, memberships] =
      await Promise.all([
        db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: {
            id: true,
            name: true,
            email: true,
            isPlatformStaff: true,
          },
        }),
        db.query.marketplaceAccounts.findFirst({
          where: eq(marketplaceAccounts.userId, userId),
          columns: { accountStatus: true },
        }),
        db.query.userRoles.findFirst({
          where: eq(userRoles.userId, userId),
          columns: { role: true },
        }),
        db.query.entertainerProfiles.findFirst({
          where: eq(entertainerProfiles.userId, userId),
          columns: {
            id: true,
            actName: true,
            publicationState: true,
          },
        }),
        db
          .select({
            id: venues.id,
            name: venues.name,
            publicationState: venues.publicationState,
            membershipRole: venueMemberships.role,
          })
          .from(venueMemberships)
          .innerJoin(venues, eq(venues.id, venueMemberships.venueId))
          .where(
            and(
              eq(venueMemberships.userId, userId),
              eq(venueMemberships.status, "active"),
            ),
          ),
      ]);

    if (!user) continue;

    hits.push({
      userId: user.id,
      name: user.name,
      email: user.email,
      accountStatus: account?.accountStatus ?? null,
      role: (roleRow?.role as "entertainer" | "venue" | undefined) ?? null,
      isPlatformStaff: user.isPlatformStaff,
      entertainer: entertainer
        ? {
            id: entertainer.id,
            actName: entertainer.actName,
            publicationState: entertainer.publicationState,
          }
        : null,
      venues: memberships.map((row) => ({
        id: row.id,
        name: row.name,
        publicationState: row.publicationState,
        membershipRole: row.membershipRole,
      })),
    });
  }

  return hits;
}
