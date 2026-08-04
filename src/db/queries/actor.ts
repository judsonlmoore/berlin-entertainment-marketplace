import { and, eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { users } from "@/src/db/schema";
import {
  entertainerProfiles,
  marketplaceAccounts,
  userRoles,
  venueMemberships,
  venues,
} from "@/src/db/schema/marketplace";
import type { AccountStatus } from "@/src/domain/approval";
import type {
  ActorContext,
  MarketplaceRole,
  VenueMembershipRole,
} from "@/src/domain/permissions";

export async function getActorContext(
  userId: string,
): Promise<ActorContext | null> {
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return null;
  }

  const [account, roles, memberships, entertainer, verifiedVenue] =
    await Promise.all([
      db.query.marketplaceAccounts.findFirst({
        where: eq(marketplaceAccounts.userId, userId),
      }),
      db.query.userRoles.findMany({
        where: eq(userRoles.userId, userId),
      }),
      db.query.venueMemberships.findMany({
        where: and(
          eq(venueMemberships.userId, userId),
          eq(venueMemberships.status, "active"),
        ),
      }),
      db.query.entertainerProfiles.findFirst({
        where: eq(entertainerProfiles.userId, userId),
        columns: { publicationState: true },
      }),
      db
        .select({ id: venues.id })
        .from(venueMemberships)
        .innerJoin(venues, eq(venues.id, venueMemberships.venueId))
        .where(
          and(
            eq(venueMemberships.userId, userId),
            eq(venueMemberships.status, "active"),
            eq(venues.publicationState, "approved"),
          ),
        )
        .limit(1),
    ]);

  return {
    userId: user.id,
    isPlatformStaff: user.isPlatformStaff,
    accountStatus:
      (account?.accountStatus as AccountStatus | undefined) ?? null,
    roles: roles.map((role) => role.role as MarketplaceRole),
    entertainerVerified: entertainer?.publicationState === "approved",
    venueVerified: verifiedVenue.length > 0,
    venueMemberships: memberships.map((membership) => ({
      venueId: membership.venueId,
      role: membership.role as VenueMembershipRole,
      status: membership.status,
    })),
  };
}
