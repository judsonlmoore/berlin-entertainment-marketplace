export const BOOKING_STATES = [
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
] as const;

export type BookingState = (typeof BOOKING_STATES)[number];

export type BookingParty = "venue" | "entertainer" | "staff" | "system";

export const DEPOSIT_STATUSES = [
  "not_required",
  "pending",
  "received",
  "refunded",
  "disputed",
] as const;

export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];

export const TERMINAL_BOOKING_STATES = [
  "declined",
  "rejected",
  "withdrawn",
  "expired",
  "cancelled",
] as const satisfies readonly BookingState[];

/** States from which either origin can move into agreed terms. */
export const TERMS_ELIGIBLE_STATES = [
  "shortlisted",
  "accepted",
] as const satisfies readonly BookingState[];

const LEGAL_TRANSITIONS: Record<BookingState, readonly BookingState[]> = {
  requested: ["accepted", "declined", "withdrawn", "expired"],
  applied: ["shortlisted", "rejected", "withdrawn", "expired"],
  shortlisted: [
    "terms_agreed",
    "rejected",
    "withdrawn",
    "cancelled",
    "expired",
  ],
  accepted: ["terms_agreed", "declined", "withdrawn", "cancelled", "expired"],
  terms_agreed: ["agreement_generated", "cancelled"],
  agreement_generated: ["partially_signed", "cancelled"],
  partially_signed: ["confirmed", "cancelled"],
  confirmed: ["cancelled"],
  declined: [],
  rejected: [],
  withdrawn: [],
  expired: [],
  cancelled: [],
};

/** Which parties may drive each target transition (after legal edge check). */
const ACTOR_TRANSITIONS: Record<
  BookingState,
  Partial<Record<BookingState, readonly BookingParty[]>>
> = {
  requested: {
    accepted: ["entertainer", "system"],
    declined: ["entertainer"],
    withdrawn: ["venue"],
    expired: ["system"],
  },
  applied: {
    shortlisted: ["venue", "system"],
    rejected: ["venue"],
    withdrawn: ["entertainer"],
    expired: ["system"],
  },
  shortlisted: {
    terms_agreed: ["venue", "entertainer"],
    rejected: ["venue"],
    withdrawn: ["entertainer"],
    cancelled: ["venue", "entertainer", "staff"],
    expired: ["system"],
  },
  accepted: {
    terms_agreed: ["venue", "entertainer"],
    declined: ["entertainer"],
    withdrawn: ["venue"],
    cancelled: ["venue", "entertainer", "staff"],
    expired: ["system"],
  },
  terms_agreed: {
    agreement_generated: ["venue", "entertainer", "staff", "system"],
    cancelled: ["venue", "entertainer", "staff"],
  },
  agreement_generated: {
    partially_signed: ["system"],
    cancelled: ["venue", "entertainer", "staff"],
  },
  partially_signed: {
    confirmed: ["system"],
    cancelled: ["venue", "entertainer", "staff"],
  },
  confirmed: {
    cancelled: ["venue", "entertainer", "staff"],
  },
  declined: {},
  rejected: {},
  withdrawn: {},
  expired: {},
  cancelled: {},
};

export function isTerminalBookingState(state: BookingState): boolean {
  return (TERMINAL_BOOKING_STATES as readonly string[]).includes(state);
}

export function isTermsEligibleState(state: BookingState): boolean {
  return (TERMS_ELIGIBLE_STATES as readonly string[]).includes(state);
}

export function canTransitionBooking(
  from: BookingState,
  to: BookingState,
): boolean {
  if (from === to) return false;
  return LEGAL_TRANSITIONS[from].includes(to);
}

export function canActorTransitionBooking(
  from: BookingState,
  to: BookingState,
  actor: BookingParty,
): boolean {
  if (!canTransitionBooking(from, to)) return false;
  const allowed = ACTOR_TRANSITIONS[from][to];
  return Boolean(allowed?.includes(actor));
}

export function canCancelBooking(
  state: BookingState,
  actor: BookingParty,
): boolean {
  return canActorTransitionBooking(state, "cancelled", actor);
}

/**
 * Deposit status is independent of booking confirmation.
 * Changing deposit never confirms a booking; missing deposit never blocks signatures.
 */
export function depositAffectsBookingConfirmation(): false {
  return false;
}

export function canRecordDepositStatus(
  bookingState: BookingState,
  next: DepositStatus,
): boolean {
  if (!(DEPOSIT_STATUSES as readonly string[]).includes(next)) return false;
  // History is retained for terminal bookings; staff/operators may correct status.
  return bookingState !== "expired" || next !== "pending";
}

export function nextTermsVersion(currentMaxVersion: number | null): number {
  return (currentMaxVersion ?? 0) + 1;
}
