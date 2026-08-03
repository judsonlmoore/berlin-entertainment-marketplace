import { hasMarketplaceAccess, type ApprovalState } from "./approval";

export type MarketplaceRole = "entertainer" | "venue";
export type VenueMembershipRole = "owner" | "member";

export type ActorContext = {
  userId: string;
  isPlatformStaff: boolean;
  approvalState: ApprovalState | null;
  roles: readonly MarketplaceRole[];
  venueMemberships: readonly {
    venueId: string;
    role: VenueMembershipRole;
    status: "active" | "invited" | "removed";
  }[];
};

export type Permission =
  | "marketplace.discover"
  | "onboarding.submit"
  | "admin.review_accounts"
  | "admin.change_approval"
  | "venue.manage"
  | "venue.operate"
  | "entertainer.manage_own_profile";

function isActiveVenueMember(
  actor: ActorContext,
  venueId: string,
  roles?: readonly VenueMembershipRole[],
): boolean {
  return actor.venueMemberships.some(
    (membership) =>
      membership.venueId === venueId &&
      membership.status === "active" &&
      (!roles || roles.includes(membership.role)),
  );
}

export function can(
  actor: ActorContext,
  permission: Permission,
  resource?: { venueId?: string },
): boolean {
  switch (permission) {
    case "onboarding.submit":
      return Boolean(actor.userId);

    case "admin.review_accounts":
    case "admin.change_approval":
      return actor.isPlatformStaff;

    case "marketplace.discover":
      return (
        (!actor.isPlatformStaff &&
          actor.approvalState !== null &&
          hasMarketplaceAccess(actor.approvalState)) ||
        actor.isPlatformStaff
      );

    case "entertainer.manage_own_profile":
      return (
        actor.roles.includes("entertainer") &&
        actor.approvalState !== "suspended"
      );

    case "venue.manage":
      return (
        Boolean(resource?.venueId) &&
        isActiveVenueMember(actor, resource!.venueId!, ["owner"]) &&
        actor.approvalState !== "suspended"
      );

    case "venue.operate":
      return (
        Boolean(resource?.venueId) &&
        isActiveVenueMember(actor, resource!.venueId!, ["owner", "member"]) &&
        actor.approvalState !== "suspended"
      );

    default:
      return false;
  }
}

export function assertCan(
  actor: ActorContext,
  permission: Permission,
  resource?: { venueId?: string },
): void {
  if (!can(actor, permission, resource)) {
    throw new Error(`Forbidden: ${permission}`);
  }
}
