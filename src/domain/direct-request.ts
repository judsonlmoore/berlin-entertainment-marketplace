export const DIRECT_REQUEST_STATES = [
  "requested",
  "changes_proposed",
  "accepted",
  "declined",
  "withdrawn",
  "expired",
] as const;

export type DirectRequestState = (typeof DIRECT_REQUEST_STATES)[number];

export const DIRECT_REQUEST_RESPONSE_DEADLINE_DAYS = 7;

const VENUE_TRANSITIONS: Record<
  DirectRequestState,
  readonly DirectRequestState[]
> = {
  requested: ["withdrawn"],
  changes_proposed: ["accepted", "declined", "withdrawn"],
  accepted: [],
  declined: [],
  withdrawn: [],
  expired: [],
};

const ENTERTAINER_TRANSITIONS: Record<
  DirectRequestState,
  readonly DirectRequestState[]
> = {
  requested: ["accepted", "declined", "changes_proposed"],
  changes_proposed: [],
  accepted: [],
  declined: [],
  withdrawn: [],
  expired: [],
};

const SYSTEM_TRANSITIONS: Record<
  DirectRequestState,
  readonly DirectRequestState[]
> = {
  requested: ["expired"],
  changes_proposed: [],
  accepted: [],
  declined: [],
  withdrawn: [],
  expired: [],
};

export function canVenueTransitionDirectRequest(
  from: DirectRequestState,
  to: DirectRequestState,
): boolean {
  if (from === to) return false;
  return VENUE_TRANSITIONS[from].includes(to);
}

export function canEntertainerTransitionDirectRequest(
  from: DirectRequestState,
  to: DirectRequestState,
): boolean {
  if (from === to) return false;
  return ENTERTAINER_TRANSITIONS[from].includes(to);
}

export function canSystemTransitionDirectRequest(
  from: DirectRequestState,
  to: DirectRequestState,
): boolean {
  if (from === to) return false;
  return SYSTEM_TRANSITIONS[from].includes(to);
}

export function defaultResponseDeadlineAt(
  from = new Date(),
  days = DIRECT_REQUEST_RESPONSE_DEADLINE_DAYS,
): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
