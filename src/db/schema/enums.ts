import { pgEnum } from "drizzle-orm/pg-core";

export const accountStatusEnum = pgEnum("account_status", [
  "active",
  "suspended",
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

export const opportunityKindEnum = pgEnum("opportunity_kind", [
  "dated",
  "standing",
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

/** Profile PDF visibility: discovery vs booking-pipeline unlock. */
export const profileDocumentVisibilityEnum = pgEnum(
  "profile_document_visibility",
  ["marketplace", "engagement"],
);

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
  "profile_enquiry",
]);

export const profileEnquiryStateEnum = pgEnum("profile_enquiry_state", [
  "pending",
  "interested",
  "passed",
  "withdrawn",
]);

export const postGigSurveyPartyRoleEnum = pgEnum("post_gig_survey_party_role", [
  "venue",
  "entertainer",
]);

export const postGigSurveyStatusEnum = pgEnum("post_gig_survey_status", [
  "invited",
  "submitted",
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

export const notificationTypeEnum = pgEnum("notification_type", [
  "booking_request_received",
  "booking_accepted",
  "booking_declined",
  "booking_confirmed",
  "booking_cancelled",
  "booking_post_gig_survey_ready",
  "application_submitted",
  "application_shortlisted",
  "application_rejected",
  "agreement_ready",
  "agreement_signed",
  "approval_approved",
  "approval_changes_requested",
  "approval_suspended",
  "direct_request_received",
  "direct_request_accepted",
  "direct_request_declined",
  "profile_enquiry_received",
  "profile_enquiry_interested",
  "profile_enquiry_passed",
  "opportunity_published",
  "calendar_conflict_detected",
  "hold_expiring_soon",
  "venue_member_invited",
  "venue_member_removed",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "in_app",
  "email",
]);

export const emailStatusEnum = pgEnum("email_status", [
  "pending",
  "sent",
  "failed",
  "bounced",
]);

export const legalEntityTypeEnum = pgEnum("legal_entity_type", [
  "individual",
  "freelancer",
  "registered_business",
]);

export const bookingInvoiceStatusEnum = pgEnum("booking_invoice_status", [
  "draft",
  "generated",
  "failed",
]);
