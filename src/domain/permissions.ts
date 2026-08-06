import { AppError } from "./errors";
import { hasMarketplaceAccess, type AccountStatus } from "./approval";

export type MarketplaceRole = "entertainer" | "venue";

export type ActorContext = {
  userId: string;
  isPlatformStaff: boolean;
  accountStatus: AccountStatus | null;
  roles: readonly MarketplaceRole[];
  /** Entertainer profile publication is staff-approved. */
  entertainerVerified: boolean;
  /** Owned venue is staff-approved for publication. */
  venueVerified: boolean;
  /** Owned venue id when buyer has a venue; null otherwise. */
  venueId: string | null;
};

/** Profile drafting for active members (and staff). */
function canDraftProfiles(actor: ActorContext): boolean {
  return (
    actor.isPlatformStaff ||
    (actor.accountStatus !== null && hasMarketplaceAccess(actor.accountStatus))
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
  | "profile_enquiry.send"
  | "profile_enquiry.respond"
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
    (actor.accountStatus !== null && hasMarketplaceAccess(actor.accountStatus))
  );
}

function isActiveVenueOperator(actor: ActorContext): boolean {
  return actor.roles.includes("venue") || Boolean(actor.venueId);
}

function ownsVenue(actor: ActorContext, venueId: string): boolean {
  return actor.venueId === venueId;
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
      return (
        actor.isPlatformStaff ||
        (hasPrivateAccess(actor) && isActiveVenueOperator(actor))
      );

    case "discover.venues":
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
        ownsVenue(actor, resource!.venueId!) &&
        canDraftProfiles(actor)
      );

    case "venue.operate":
    case "opportunity.manage":
    case "application.review":
      return (
        Boolean(resource?.venueId) &&
        ownsVenue(actor, resource!.venueId!) &&
        hasPrivateAccess(actor)
      );

    case "direct_request.send":
      return (
        Boolean(resource?.venueId) &&
        ownsVenue(actor, resource!.venueId!) &&
        hasPrivateAccess(actor) &&
        actor.venueVerified
      );

    case "opportunity.apply":
    case "direct_request.respond":
    case "profile_enquiry.send":
      return (
        actor.roles.includes("entertainer") &&
        hasPrivateAccess(actor) &&
        actor.entertainerVerified
      );

    case "profile_enquiry.respond":
      return (
        Boolean(resource?.venueId) &&
        ownsVenue(actor, resource!.venueId!) &&
        hasPrivateAccess(actor) &&
        actor.venueVerified
      );

    case "booking.view":
    case "booking.propose_terms":
    case "booking.accept_terms":
    case "booking.cancel":
    case "booking.generate_agreement":
    case "booking.sign_agreement":
      return actor.isPlatformStaff || hasPrivateAccess(actor);

    case "booking.record_deposit":
      return (
        actor.isPlatformStaff ||
        (Boolean(resource?.venueId) &&
          ownsVenue(actor, resource!.venueId!) &&
          hasPrivateAccess(actor))
      );

    case "calendar.manage":
      return (
        actor.isPlatformStaff ||
        (hasPrivateAccess(actor) &&
          (actor.roles.includes("entertainer") || Boolean(actor.venueId)))
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
