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
  requested: ["accepted", "terms_agreed", "declined", "withdrawn", "expired"],
  applied: ["shortlisted", "terms_agreed", "rejected", "withdrawn", "expired"],
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
    terms_agreed: ["venue", "entertainer"],
    declined: ["entertainer"],
    withdrawn: ["venue"],
    expired: ["system"],
  },
  applied: {
    shortlisted: ["venue", "system"],
    terms_agreed: ["venue", "entertainer"],
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

/** Open offer: not accepted and not superseded. */
export function isOpenTermsOffer(terms: {
  acceptedAt: Date | null;
  supersededAt?: Date | null;
}): boolean {
  return !terms.acceptedAt && !terms.supersededAt;
}

export type TermsOfferAction =
  | { kind: "compose" }
  | { kind: "wait" }
  | { kind: "respond"; termsId: string }
  | { kind: "none" };

/** Pending profile-origin bookings that already carry offer v1. */
export function isPendingOfferState(state: BookingState): boolean {
  return state === "requested" || state === "applied";
}

/**
 * Who may act on commercial offers.
 * - Open (shortlisted/accepted): compose / wait / respond as usual
 * - Pending profile offer: wait or respond only (first Send offer creates the booking)
 */
export function resolveTermsOfferAction(input: {
  bookingState: BookingState;
  actorUserId: string;
  openOffer: { id: string; proposedByUserId: string } | null;
  /** Profile-origin pending bookings allow respond/wait on the opening offer. */
  allowPendingOfferResponse?: boolean;
}): TermsOfferAction {
  const pendingOfferFlow =
    Boolean(input.allowPendingOfferResponse) &&
    isPendingOfferState(input.bookingState);

  if (!isTermsEligibleState(input.bookingState) && !pendingOfferFlow) {
    return { kind: "none" };
  }
  if (!input.openOffer) {
    if (pendingOfferFlow) return { kind: "none" };
    return { kind: "compose" };
  }
  if (input.openOffer.proposedByUserId === input.actorUserId) {
    return { kind: "wait" };
  }
  return { kind: "respond", termsId: input.openOffer.id };
}

/** Open state after Counter on a pending profile-origin booking. */
export function openStateAfterPendingCounter(
  pendingState: BookingState,
): "shortlisted" | "accepted" | null {
  if (pendingState === "applied") return "shortlisted";
  if (pendingState === "requested") return "accepted";
  return null;
}

/** Counters (version > 1) require a non-empty change note. */
export function requireChangeNoteForVersion(
  version: number,
  changeNote: string | null | undefined,
): boolean {
  if (version <= 1) return true;
  return Boolean(changeNote?.trim());
}
