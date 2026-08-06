import { describe, expect, it } from "vitest";
import type { ActorContext } from "@/src/domain/permissions";
import { applySupportOverlay } from "@/src/lib/support-overlay";
import type { SupportSessionPayload } from "@/src/lib/support-session";

/**
 * Regression contract (eng-review 1B / T1A): under support mode, marketplace
 * party fields must use the overlaid actor.userId (subject), while audits use
 * the signed-in staff id (auditUserId). Actions that still stamp session.user.id
 * onto proposedBy/requestedBy/author create a split-brain booking.
 */
describe("support-mode party vs audit identity", () => {
  const staff: ActorContext = {
    userId: "staff-1",
    isPlatformStaff: true,
    accountStatus: "active",
    roles: [],
    entertainerVerified: false,
    venueVerified: false,
    venueId: null,
  };

  const subject: ActorContext = {
    userId: "tom-electric",
    isPlatformStaff: false,
    accountStatus: "active",
    roles: ["venue"],
    entertainerVerified: false,
    venueVerified: true,
    venueId: "venue-1",
  };

  const support: SupportSessionPayload = {
    staffUserId: "staff-1",
    subjectUserId: "tom-electric",
    entityType: "venue",
    entityId: "venue-1",
    label: "Electric Social",
    exp: Date.now() + 60_000,
  };

  it("overlays party identity onto the subject, not staff", () => {
    const actor = applySupportOverlay(staff, support, subject);
    const auditUserId = support.staffUserId;

    expect(actor.userId).toBe("tom-electric");
    expect(auditUserId).toBe("staff-1");
    expect(actor.userId).not.toBe(auditUserId);

    // Simulated booking write contract
    const proposedByUserId = actor.userId;
    const auditActorUserId = auditUserId;
    expect(proposedByUserId).toBe("tom-electric");
    expect(auditActorUserId).toBe("staff-1");
  });

  it("scopes entertainer support the same way", () => {
    const entertainerSubject: ActorContext = {
      ...subject,
      userId: "act-1",
      roles: ["entertainer"],
      entertainerVerified: true,
      venueVerified: false,
      venueId: null,
    };
    const entertainerSupport: SupportSessionPayload = {
      ...support,
      subjectUserId: "act-1",
      entityType: "entertainer",
      entityId: "profile-1",
      label: "Drag Bingo Host",
    };
    const actor = applySupportOverlay(
      staff,
      entertainerSupport,
      entertainerSubject,
    );
    expect(actor.userId).toBe("act-1");
    expect(actor.roles).toEqual(["entertainer"]);
    expect(actor.isPlatformStaff).toBe(false);
  });
});
