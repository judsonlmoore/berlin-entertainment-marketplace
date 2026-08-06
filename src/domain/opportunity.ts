export const OPPORTUNITY_STATES = [
  "draft",
  "open",
  "closed",
  "cancelled",
] as const;

export type OpportunityState = (typeof OPPORTUNITY_STATES)[number];

export const OPPORTUNITY_KINDS = ["dated", "standing"] as const;

export type OpportunityKind = (typeof OPPORTUNITY_KINDS)[number];

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

/** Validate kind ↔ performance window invariants (mirrors DB check). */
export function isValidOpportunityWindow(input: {
  kind: OpportunityKind;
  startsAt: Date | null | undefined;
  endsAt: Date | null | undefined;
}): boolean {
  if (input.kind === "dated") {
    if (!input.startsAt || !input.endsAt) return false;
    return input.endsAt.getTime() > input.startsAt.getTime();
  }
  return !input.startsAt && !input.endsAt;
}

/** Staff may force-close an open opportunity or cancel a non-terminal one. */
export function canStaffModerateOpportunity(
  from: OpportunityState,
  to: "closed" | "cancelled",
): boolean {
  if (from === "cancelled") return false;
  if (to === "closed") return from === "open";
  return to === "cancelled";
}
