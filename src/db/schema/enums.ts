import { pgEnum } from "drizzle-orm/pg-core";

export const approvalStateEnum = pgEnum("approval_state", [
  "applied",
  "invited",
  "approved",
  "suspended",
  "rejected",
]);

export const marketplaceRoleEnum = pgEnum("marketplace_role", [
  "entertainer",
  "venue",
]);

export const venueMembershipRoleEnum = pgEnum("venue_membership_role", [
  "owner",
  "member",
]);

export const membershipStatusEnum = pgEnum("membership_status", [
  "active",
  "invited",
  "removed",
]);

export const contactOwnerTypeEnum = pgEnum("contact_owner_type", [
  "user",
  "venue",
  "entertainer",
]);

export const contactKindEnum = pgEnum("contact_kind", [
  "email",
  "phone",
  "other",
]);

export const opportunityStateEnum = pgEnum("opportunity_state", [
  "draft",
  "open",
  "closed",
  "cancelled",
]);

export const applicationStateEnum = pgEnum("application_state", [
  "draft",
  "submitted",
  "clarification_requested",
  "withdrawn",
  "rejected",
  "shortlisted",
]);

export const directRequestStateEnum = pgEnum("direct_request_state", [
  "requested",
  "changes_proposed",
  "accepted",
  "declined",
  "withdrawn",
  "expired",
]);

export const portfolioItemKindEnum = pgEnum("portfolio_item_kind", [
  "image",
  "link",
  "youtube",
]);

export const bookingStateEnum = pgEnum("booking_state", [
  "requested",
  "applied",
  "shortlisted",
  "accepted",
  "terms_agreed",
  "agreement_generated",
  "partially_signed",
  "confirmed",
  "declined",
  "rejected",
  "withdrawn",
  "expired",
  "cancelled",
]);

export const bookingOriginEnum = pgEnum("booking_origin", [
  "application",
  "direct_request",
]);

export const depositStatusEnum = pgEnum("deposit_status", [
  "not_required",
  "pending",
  "received",
  "refunded",
  "disputed",
]);

export const calendarOwnerTypeEnum = pgEnum("calendar_owner_type", [
  "entertainer",
  "venue_space",
]);

export const calendarEntryStateEnum = pgEnum("calendar_entry_state", [
  "available",
  "unavailable",
  "tentative_hold",
  "requested",
  "confirmed",
]);

export const profilePublicationStateEnum = pgEnum("profile_publication_state", [
  "draft",
  "submitted",
  "approved",
  "changes_requested",
  "suspended",
]);
