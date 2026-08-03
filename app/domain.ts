export type ApprovalState = "applied" | "invited" | "approved" | "suspended";
export type MembershipRole = "owner" | "member";
export type CalendarStatus = "available" | "unavailable" | "tentative_hold" | "requested" | "confirmed";
export type BookingState = "request" | "application" | "shortlisted" | "accepted" | "terms_agreed" | "agreement_generated" | "signatures" | "confirmed";
export type DepositStatus = "not_required" | "pending" | "received" | "refunded";

export interface MarketplaceIdentity {
  id: string;
  approval: ApprovalState;
  roles: Array<"entertainer" | "venue">;
}

export interface VenueMembership {
  personId: string;
  venueId: string;
  role: MembershipRole;
}

export interface EngagementPrivacy {
  contactVisible: boolean;
  unlockedBy: "accepted_request" | "shortlisted_application" | null;
}
