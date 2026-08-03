import { BOOKING_STATES, type BookingState } from "@/src/domain/booking";

const TRACK: BookingState[] = [
  "applied",
  "requested",
  "shortlisted",
  "accepted",
  "terms_agreed",
  "agreement_generated",
  "partially_signed",
  "confirmed",
];

function trackIndex(state: BookingState): number {
  if (state === "applied" || state === "requested") return 0;
  if (state === "shortlisted" || state === "accepted") return 1;
  const idx = TRACK.indexOf(state);
  return idx >= 0 ? idx : -1;
}

const DISPLAY_STEPS = [
  "shortlisted_or_accepted",
  "terms_agreed",
  "agreement_generated",
  "partially_signed",
  "confirmed",
] as const;

export type LifecycleStepId = (typeof DISPLAY_STEPS)[number];

export function bookingLifecycleSteps(state: BookingState): {
  id: LifecycleStepId;
  status: "complete" | "current" | "upcoming" | "terminal";
}[] {
  if (
    state === "declined" ||
    state === "rejected" ||
    state === "withdrawn" ||
    state === "expired" ||
    state === "cancelled"
  ) {
    return DISPLAY_STEPS.map((id) => ({ id, status: "terminal" as const }));
  }

  const current =
    state === "applied" || state === "requested"
      ? "shortlisted_or_accepted"
      : state === "shortlisted" || state === "accepted"
        ? "shortlisted_or_accepted"
        : (state as LifecycleStepId);

  const currentIdx = DISPLAY_STEPS.indexOf(current);

  return DISPLAY_STEPS.map((id, index) => {
    if (index < currentIdx) return { id, status: "complete" as const };
    if (index === currentIdx) return { id, status: "current" as const };
    return { id, status: "upcoming" as const };
  });
}

export function isKnownBookingState(value: string): value is BookingState {
  return (BOOKING_STATES as readonly string[]).includes(value);
}

// silence unused helper warning if trackIndex unused - use in tests
export { trackIndex };
