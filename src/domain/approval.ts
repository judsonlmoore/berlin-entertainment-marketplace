export const ACCOUNT_STATUSES = ["active", "suspended"] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

const STAFF_TRANSITIONS: Record<AccountStatus, readonly AccountStatus[]> = {
  active: ["suspended"],
  suspended: ["active"],
};

export function canTransitionAccountStatus(
  from: AccountStatus,
  to: AccountStatus,
): boolean {
  if (from === to) {
    return false;
  }
  return STAFF_TRANSITIONS[from].includes(to);
}

export function assertAccountStatusTransition(
  from: AccountStatus,
  to: AccountStatus,
): void {
  if (!canTransitionAccountStatus(from, to)) {
    throw new Error(`Invalid account status transition: ${from} -> ${to}`);
  }
}

/** Active (non-suspended) accounts may use private marketplace surfaces. */
export function hasMarketplaceAccess(status: AccountStatus): boolean {
  return status === "active";
}

/** @deprecated Use AccountStatus / hasMarketplaceAccess(status) */
export type ApprovalState = AccountStatus;
export const APPROVAL_STATES = ACCOUNT_STATUSES;
export const canTransitionApproval = canTransitionAccountStatus;
export const assertApprovalTransition = assertAccountStatusTransition;
