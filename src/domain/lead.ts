import {
  isPendingOfferState,
  resolveTermsOfferAction,
  type BookingState,
} from "@/src/domain/booking";

export const LEAD_STATUSES = [
  "open",
  "confirmed",
  "done",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type LeadOriginChannel =
  | "application"
  | "direct_request"
  | "profile_enquiry";

export const BOOKING_NEEDS_ACTIONS = [
  "respond_offer",
  "respond_request",
  "sign",
  "review_application",
] as const;

export type BookingNeedsAction = (typeof BOOKING_NEEDS_ACTIONS)[number];

const LOST_BOOKING_STATES = new Set<BookingState>([
  "declined",
  "rejected",
  "withdrawn",
  "expired",
  "cancelled",
]);

/** Mid-pipeline + early outreach — all project to inbox Open. */
const OPEN_INBOX_BOOKING_STATES = new Set<BookingState>([
  "applied",
  "requested",
  "shortlisted",
  "accepted",
  "terms_agreed",
  "agreement_generated",
  "partially_signed",
]);

/** Connection established — contacts unlocked (not early applied/requested). */
const CONTACTS_UNLOCKED_BOOKING_STATES = new Set<BookingState>([
  "shortlisted",
  "accepted",
  "terms_agreed",
  "agreement_generated",
  "partially_signed",
  "confirmed",
]);

/**
 * Project inbox pipeline status from booking state (+ optional performance end).
 * Done when confirmed and the performance window has ended.
 */
export function projectLeadStatus(input: {
  bookingState: BookingState;
  performanceEndsAt?: Date | null;
  now?: Date;
}): LeadStatus {
  const now = input.now ?? new Date();
  if (LOST_BOOKING_STATES.has(input.bookingState)) return "lost";
  if (input.bookingState === "confirmed") {
    if (
      input.performanceEndsAt &&
      input.performanceEndsAt.getTime() <= now.getTime()
    ) {
      return "done";
    }
    return "confirmed";
  }
  if (OPEN_INBOX_BOOKING_STATES.has(input.bookingState)) return "open";
  return "open";
}

/** Contacts unlock after mutual opt-in — not merely because the inbox shows Open. */
export function bookingContactsUnlocked(bookingState: BookingState): boolean {
  return CONTACTS_UNLOCKED_BOOKING_STATES.has(bookingState);
}

/** Map legacy filter query values to current LeadStatus | all. */
export function normalizeLeadStatusFilter(
  raw: string | undefined,
): LeadStatus | "all" {
  if (!raw) return "open";
  if (raw === "all") return "all";
  if (raw === "pending") return "open";
  if (raw === "won") return "confirmed";
  if (raw === "completed") return "done";
  if ((LEAD_STATUSES as readonly string[]).includes(raw)) {
    return raw as LeadStatus;
  }
  return "open";
}

/**
 * Per-actor action cue for the Bookings inbox (not a pipeline status).
 */
export function resolveBookingNeedsAction(input: {
  actorUserId: string;
  isVenueParty: boolean;
  isEntertainerParty: boolean;
  bookingState: BookingState;
  originType: LeadOriginChannel;
  openOfferProposedByUserId: string | null;
  directRequestState: string | null;
  pendingSignatureForActor: boolean;
}): BookingNeedsAction | null {
  if (input.pendingSignatureForActor) return "sign";

  const offerAction = resolveTermsOfferAction({
    bookingState: input.bookingState,
    actorUserId: input.actorUserId,
    openOffer: input.openOfferProposedByUserId
      ? { id: "_", proposedByUserId: input.openOfferProposedByUserId }
      : null,
    allowPendingOfferResponse:
      input.originType === "profile_enquiry" &&
      isPendingOfferState(input.bookingState),
  });
  if (offerAction.kind === "respond") return "respond_offer";

  if (input.originType === "direct_request" && input.directRequestState) {
    if (
      input.directRequestState === "requested" &&
      input.isEntertainerParty
    ) {
      return "respond_request";
    }
    if (
      input.directRequestState === "changes_proposed" &&
      input.isVenueParty
    ) {
      return "respond_request";
    }
  }

  if (
    input.originType === "application" &&
    input.bookingState === "applied" &&
    input.isVenueParty
  ) {
    return "review_application";
  }

  return null;
}
