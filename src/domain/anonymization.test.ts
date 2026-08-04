import { describe, expect, it } from "vitest";
import {
  anonymizePii,
  anonymizeContactValue,
  validateAnonymizationPreconditions,
  prepareAnonymizationAudit,
} from "./anonymization";

describe("anonymizePii", () => {
  it("anonymizes user PII while preserving unique identifiers", () => {
    const userId = "test-user-id-12345";
    const result = anonymizePii(userId);

    expect(result.name).toContain("Anonymized User");
    expect(result.name).toContain(userId.slice(0, 8));
    expect(result.email).toContain("anonymized-");
    expect(result.email).toContain(userId);
    expect(result.email).toContain("@deleted.local");
    expect(result.image).toBeNull();
  });

  it("generates unique anonymized data for different users", () => {
    const user1 = anonymizePii("user1");
    const user2 = anonymizePii("user2");

    expect(user1.email).not.toBe(user2.email);
    expect(user1.name).not.toBe(user2.name);
  });
});

describe("anonymizeContactValue", () => {
  it("anonymizes email contacts", () => {
    const contactId = "contact-123";
    const result = anonymizeContactValue(contactId, "email");

    expect(result).toContain("anonymized-contact-");
    expect(result).toContain("@deleted.local");
  });

  it("anonymizes phone contacts", () => {
    const result = anonymizeContactValue("contact-456", "phone");

    expect(result).toBe("+00000000000");
  });

  it("anonymizes other contact types", () => {
    const contactId = "contact-789";
    const result = anonymizeContactValue(contactId, "other");

    expect(result).toContain("Anonymized Contact");
    expect(result).toContain(contactId.slice(0, 8));
  });
});

describe("validateAnonymizationPreconditions", () => {
  it("allows anonymization when all preconditions are met", () => {
    expect(() =>
      validateAnonymizationPreconditions({
        userId: "test-user",
        isAlreadyAnonymized: false,
        hasActiveBookings: false,
        hasUnresolvedDisputes: false,
      }),
    ).not.toThrow();
  });

  it("rejects anonymization if already anonymized", () => {
    expect(() =>
      validateAnonymizationPreconditions({
        userId: "test-user",
        isAlreadyAnonymized: true,
        hasActiveBookings: false,
        hasUnresolvedDisputes: false,
      }),
    ).toThrow("already anonymized");
  });

  it("rejects anonymization if user has active bookings", () => {
    expect(() =>
      validateAnonymizationPreconditions({
        userId: "test-user",
        isAlreadyAnonymized: false,
        hasActiveBookings: true,
        hasUnresolvedDisputes: false,
      }),
    ).toThrow("active bookings");
  });

  it("rejects anonymization if user has unresolved disputes", () => {
    expect(() =>
      validateAnonymizationPreconditions({
        userId: "test-user",
        isAlreadyAnonymized: false,
        hasActiveBookings: false,
        hasUnresolvedDisputes: true,
      }),
    ).toThrow("unresolved disputes");
  });
});

describe("prepareAnonymizationAudit", () => {
  it("creates audit metadata for user-requested deletion", () => {
    const timestamp = new Date("2026-08-03T12:00:00Z");
    const result = prepareAnonymizationAudit({
      userId: "user-123",
      reason: "user_requested",
      timestamp,
      actorUserId: "user-123",
    });

    expect(result.action).toBe("user.anonymized");
    expect(result.subjectType).toBe("user");
    expect(result.subjectId).toBe("user-123");
    expect(result.metadata.reason).toBe("user_requested");
    expect(result.metadata.anonymizedAt).toBe("2026-08-03T12:00:00.000Z");
    expect(result.metadata.requestedBy).toBe("user-123");
  });

  it("creates audit metadata for GDPR right to erasure", () => {
    const timestamp = new Date();
    const result = prepareAnonymizationAudit({
      userId: "user-456",
      reason: "gdpr_right_to_erasure",
      timestamp,
      actorUserId: "staff-789",
    });

    expect(result.action).toBe("user.anonymized");
    expect(result.metadata.reason).toBe("gdpr_right_to_erasure");
    expect(result.metadata.requestedBy).toBe("staff-789");
  });
});
