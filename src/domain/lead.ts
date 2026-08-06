import type { BookingState } from "@/src/domain/booking";

export const LEAD_STATUSES = [
  "pending",
  "open",
  "won",
  "lost",
  "completed",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type LeadOriginChannel =
  "application" | "direct_request" | "profile_enquiry";

const LOST_BOOKING_STATES = new Set<BookingState>([
  "declined",
  "rejected",
  "withdrawn",
  "expired",
  "cancelled",
]);

const OPEN_BOOKING_STATES = new Set<BookingState>([
  "shortlisted",
  "accepted",
  "terms_agreed",
  "agreement_generated",
  "partially_signed",
]);

/**
 * Project CRM lead status from booking state (+ optional performance end).
 * Completed when confirmed and the performance window has ended.
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
      return "completed";
    }
    return "won";
  }
  if (OPEN_BOOKING_STATES.has(input.bookingState)) return "open";
  if (input.bookingState === "requested" || input.bookingState === "applied") {
    return "pending";
  }
  return "pending";
}

export function leadContactsUnlocked(status: LeadStatus): boolean {
  return status === "open" || status === "won" || status === "completed";
}
