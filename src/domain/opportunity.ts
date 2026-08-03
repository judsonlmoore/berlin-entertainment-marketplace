export const OPPORTUNITY_STATES = [
  "draft",
  "open",
  "closed",
  "cancelled",
] as const;

export type OpportunityState = (typeof OPPORTUNITY_STATES)[number];

const OWNER_TRANSITIONS: Record<OpportunityState, readonly OpportunityState[]> =
  {
    draft: ["open", "cancelled"],
    open: ["closed", "cancelled"],
    closed: ["open"],
    cancelled: [],
  };

export function canTransitionOpportunity(
  from: OpportunityState,
  to: OpportunityState,
): boolean {
  if (from === to) return false;
  return OWNER_TRANSITIONS[from].includes(to);
}

export function isOpportunityAcceptingApplications(
  state: OpportunityState,
  deadline: Date | null,
  now = new Date(),
): boolean {
  if (state !== "open") return false;
  if (deadline && deadline.getTime() < now.getTime()) return false;
  return true;
}
