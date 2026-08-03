import { and, eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { users } from "@/src/db/schema";
import {
  marketplaceAccounts,
  userRoles,
  venueMemberships,
} from "@/src/db/schema/marketplace";
import type { ApprovalState } from "@/src/domain/approval";
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

  const [account, roles, memberships] = await Promise.all([
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
  ]);

  return {
    userId: user.id,
    isPlatformStaff: user.isPlatformStaff,
    approvalState:
      (account?.approvalState as ApprovalState | undefined) ?? null,
    roles: roles.map((role) => role.role as MarketplaceRole),
    venueMemberships: memberships.map((membership) => ({
      venueId: membership.venueId,
      role: membership.role as VenueMembershipRole,
      status: membership.status,
    })),
  };
}
