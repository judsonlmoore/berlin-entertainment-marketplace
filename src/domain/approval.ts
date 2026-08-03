export const APPROVAL_STATES = [
  "applied",
  "invited",
  "approved",
  "suspended",
  "rejected",
] as const;

export type ApprovalState = (typeof APPROVAL_STATES)[number];

const STAFF_TRANSITIONS: Record<ApprovalState, readonly ApprovalState[]> = {
  applied: ["invited", "approved", "suspended", "rejected"],
  invited: ["applied", "approved", "suspended", "rejected"],
  approved: ["suspended", "applied", "rejected"],
  suspended: ["approved", "applied", "rejected"],
  rejected: ["applied", "invited"],
};

export function canTransitionApproval(
  from: ApprovalState,
  to: ApprovalState,
): boolean {
  if (from === to) {
    return false;
  }
  return STAFF_TRANSITIONS[from].includes(to);
}

export function assertApprovalTransition(
  from: ApprovalState,
  to: ApprovalState,
): void {
  if (!canTransitionApproval(from, to)) {
    throw new Error(`Invalid approval transition: ${from} -> ${to}`);
  }
}

export function hasMarketplaceAccess(state: ApprovalState): boolean {
  return state === "approved";
}
