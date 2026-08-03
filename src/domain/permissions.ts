import { AppError } from "./errors";
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

/** Profile drafting before staff approval (not rejected/suspended). */
function canDraftProfiles(actor: ActorContext): boolean {
  return (
    actor.approvalState === "applied" ||
    actor.approvalState === "invited" ||
    actor.approvalState === "approved"
  );
}

export type Permission =
  | "marketplace.discover"
  | "discover.entertainers"
  | "discover.venues"
  | "onboarding.submit"
  | "admin.review_accounts"
  | "admin.change_approval"
  | "admin.review_profiles"
  | "admin.operations"
  | "venue.create"
  | "venue.manage"
  | "venue.operate"
  | "entertainer.manage_own_profile"
  | "opportunity.manage"
  | "opportunity.apply"
  | "application.review"
  | "direct_request.send"
  | "direct_request.respond"
  | "booking.view"
  | "booking.propose_terms"
  | "booking.accept_terms"
  | "booking.cancel"
  | "booking.record_deposit"
  | "booking.generate_agreement"
  | "booking.sign_agreement"
  | "calendar.manage";

function hasPrivateAccess(actor: ActorContext): boolean {
  return (
    actor.isPlatformStaff ||
    (actor.approvalState !== null && hasMarketplaceAccess(actor.approvalState))
  );
}

function isActiveVenueOperator(actor: ActorContext): boolean {
  return (
    actor.roles.includes("venue") ||
    actor.venueMemberships.some((m) => m.status === "active")
  );
}

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
    case "admin.review_profiles":
    case "admin.operations":
      return actor.isPlatformStaff;

    case "marketplace.discover":
      return hasPrivateAccess(actor);

    case "discover.entertainers":
      // Venues (and staff) browse acts — never peer entertainers as the primary mode.
      return (
        actor.isPlatformStaff ||
        (hasPrivateAccess(actor) && isActiveVenueOperator(actor))
      );

    case "discover.venues":
      // Entertainers (and staff) browse venues/opportunities.
      return (
        actor.isPlatformStaff ||
        (hasPrivateAccess(actor) && actor.roles.includes("entertainer"))
      );

    case "entertainer.manage_own_profile":
      return actor.roles.includes("entertainer") && canDraftProfiles(actor);

    case "venue.create":
      return actor.roles.includes("venue") && canDraftProfiles(actor);

    case "venue.manage":
      return (
        Boolean(resource?.venueId) &&
        isActiveVenueMember(actor, resource!.venueId!, ["owner"]) &&
        canDraftProfiles(actor)
      );

    case "venue.operate":
    case "opportunity.manage":
    case "application.review":
    case "direct_request.send":
      return (
        Boolean(resource?.venueId) &&
        isActiveVenueMember(actor, resource!.venueId!, ["owner", "member"]) &&
        actor.approvalState !== null &&
        hasMarketplaceAccess(actor.approvalState)
      );

    case "opportunity.apply":
    case "direct_request.respond":
      return (
        actor.roles.includes("entertainer") &&
        actor.approvalState !== null &&
        hasMarketplaceAccess(actor.approvalState)
      );

    case "booking.view":
    case "booking.propose_terms":
    case "booking.accept_terms":
    case "booking.cancel":
    case "booking.generate_agreement":
    case "booking.sign_agreement":
      return (
        actor.isPlatformStaff ||
        (actor.approvalState !== null &&
          hasMarketplaceAccess(actor.approvalState))
      );

    case "booking.record_deposit":
      return (
        actor.isPlatformStaff ||
        (Boolean(resource?.venueId) &&
          isActiveVenueMember(actor, resource!.venueId!, ["owner", "member"]) &&
          actor.approvalState !== null &&
          hasMarketplaceAccess(actor.approvalState))
      );

    case "calendar.manage":
      return (
        actor.isPlatformStaff ||
        (actor.approvalState !== null &&
          hasMarketplaceAccess(actor.approvalState) &&
          (actor.roles.includes("entertainer") ||
            actor.venueMemberships.some((m) => m.status === "active")))
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
    throw new AppError("forbidden", `Forbidden: ${permission}`);
  }
}
