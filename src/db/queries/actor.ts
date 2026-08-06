import { eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { users } from "@/src/db/schema";
import {
  entertainerProfiles,
  marketplaceAccounts,
  userRoles,
  venues,
} from "@/src/db/schema/marketplace";
import type { AccountStatus } from "@/src/domain/approval";
import type { ActorContext, MarketplaceRole } from "@/src/domain/permissions";

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

  const [account, roles, ownedVenue, entertainer] = await Promise.all([
    db.query.marketplaceAccounts.findFirst({
      where: eq(marketplaceAccounts.userId, userId),
    }),
    db.query.userRoles.findMany({
      where: eq(userRoles.userId, userId),
    }),
    db.query.venues.findFirst({
      where: eq(venues.ownerUserId, userId),
      columns: { id: true, publicationState: true },
    }),
    db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.userId, userId),
      columns: { publicationState: true },
    }),
  ]);

  return {
    userId: user.id,
    isPlatformStaff: user.isPlatformStaff,
    accountStatus:
      (account?.accountStatus as AccountStatus | undefined) ?? null,
    roles: roles.map((role) => role.role as MarketplaceRole),
    entertainerVerified: entertainer?.publicationState === "approved",
    venueVerified: ownedVenue?.publicationState === "approved",
    venueId: ownedVenue?.id ?? null,
  };
}
