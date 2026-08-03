export const DIRECT_REQUEST_STATES = [
  "requested",
  "accepted",
  "declined",
  "withdrawn",
  "expired",
] as const;

export type DirectRequestState = (typeof DIRECT_REQUEST_STATES)[number];

const VENUE_TRANSITIONS: Record<
  DirectRequestState,
  readonly DirectRequestState[]
> = {
  requested: ["withdrawn"],
  accepted: [],
  declined: [],
  withdrawn: [],
  expired: [],
};

const ENTERTAINER_TRANSITIONS: Record<
  DirectRequestState,
  readonly DirectRequestState[]
> = {
  requested: ["accepted", "declined"],
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
