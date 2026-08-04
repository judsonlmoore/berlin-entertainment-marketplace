/**
 * Domain logic for user account anonymization.
 *
 * Account "deletion" is actually a permanent, irreversible anonymization:
 * - User data is kept for business analysis and legal compliance
 * - All PII is anonymized and cannot be recovered
 * - OAuth/provider account links and sessions are removed so the same
 *   identity can sign up again as a brand-new user
 * - The anonymized shell cannot be used or identified from marketplace PII
 */

export type AnonymizationReason =
  "user_requested" | "gdpr_right_to_erasure" | "staff_action";

export interface PiiFields {
  name: string | null;
  email: string | null;
  image: string | null;
}

/**
 * Generate anonymized values that preserve data shape but remove PII.
 * Each anonymized user gets a unique identifier for data integrity.
 */
export function anonymizePii(userId: string): PiiFields {
  return {
    name: `[Anonymized User ${userId.slice(0, 8)}]`,
    email: `anonymized-${userId}@deleted.local`,
    image: null,
  };
}

/**
 * Generate anonymized contact value based on the kind.
 * Preserves the fact that a contact existed without exposing the value.
 */
export function anonymizeContactValue(
  contactId: string,
  kind: "email" | "phone" | "other",
): string {
  switch (kind) {
    case "email":
      return `anonymized-contact-${contactId}@deleted.local`;
    case "phone":
      return `+00000000000`;
    case "other":
      return `[Anonymized Contact ${contactId.slice(0, 8)}]`;
    default:
      return `[Anonymized Contact ${contactId.slice(0, 8)}]`;
  }
}

/**
 * Validate that anonymization can proceed.
 * Throws descriptive errors if preconditions are not met.
 */
export function validateAnonymizationPreconditions(context: {
  userId: string;
  isAlreadyAnonymized: boolean;
  hasActiveBookings: boolean;
  hasUnresolvedDisputes: boolean;
}): void {
  if (context.isAlreadyAnonymized) {
    throw new Error("Account is already anonymized");
  }

  if (context.hasActiveBookings) {
    throw new Error(
      "Cannot anonymize account with active bookings. Please cancel or complete all bookings first.",
    );
  }

  if (context.hasUnresolvedDisputes) {
    throw new Error(
      "Cannot anonymize account with unresolved disputes. Please resolve all disputes first.",
    );
  }
}

/**
 * Types of data that should be anonymized during account deletion.
 */
export interface AnonymizationScope {
  userId: string;
  reason: AnonymizationReason;
  timestamp: Date;
  actorUserId: string;
}

/**
 * Prepare anonymization metadata for audit trail.
 */
export function prepareAnonymizationAudit(scope: AnonymizationScope): {
  action: string;
  subjectType: string;
  subjectId: string;
  metadata: Record<string, unknown>;
} {
  return {
    action: "user.anonymized",
    subjectType: "user",
    subjectId: scope.userId,
    metadata: {
      reason: scope.reason,
      anonymizedAt: scope.timestamp.toISOString(),
      requestedBy: scope.actorUserId,
    },
  };
}
