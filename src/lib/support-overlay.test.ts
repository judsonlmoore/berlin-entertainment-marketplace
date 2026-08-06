import { describe, expect, it } from "vitest";
import type { ActorContext, MarketplaceRole } from "@/src/domain/permissions";
import type { SupportSessionPayload } from "@/src/lib/support-session";
import { applySupportOverlay } from "@/src/lib/support-overlay";

const staff: ActorContext = {
  userId: "staff-1",
  isPlatformStaff: true,
  accountStatus: "active",
  roles: [],
  entertainerVerified: false,
  venueVerified: false,
  venueId: null,
};

const subjectEntertainer: ActorContext = {
  userId: "act-user",
  isPlatformStaff: false,
  accountStatus: "active",
  roles: ["entertainer"],
  entertainerVerified: true,
  venueVerified: false,
  venueId: null,
};

const subjectVenue: ActorContext = {
  userId: "venue-user",
  isPlatformStaff: false,
  accountStatus: "active",
  roles: ["venue"],
  entertainerVerified: false,
  venueVerified: true,
  venueId: "venue-1",
};

describe("applySupportOverlay", () => {
  it("uses subject userId and entertainer role without staff privileges", () => {
    const support: SupportSessionPayload = {
      staffUserId: "staff-1",
      subjectUserId: "act-user",
      entityType: "entertainer",
      entityId: "profile-1",
      label: "Act",
      exp: Date.now() + 60_000,
    };
    const overlay = applySupportOverlay(staff, support, subjectEntertainer);
    expect(overlay.userId).toBe("act-user");
    expect(overlay.isPlatformStaff).toBe(false);
    expect(overlay.roles).toEqual(["entertainer"]);
    expect(overlay.entertainerVerified).toBe(true);
    expect(overlay.venueId).toBeNull();
  });

  it("scopes venue support to the owned venue id", () => {
    const support: SupportSessionPayload = {
      staffUserId: "staff-1",
      subjectUserId: "venue-user",
      entityType: "venue",
      entityId: "venue-1",
      label: "Room",
      exp: Date.now() + 60_000,
    };
    const overlay = applySupportOverlay(staff, support, subjectVenue);
    expect(overlay.userId).toBe("venue-user");
    expect(overlay.roles).toEqual(["venue"] satisfies MarketplaceRole[]);
    expect(overlay.venueId).toBe("venue-1");
    expect(overlay.venueVerified).toBe(true);
  });

  it("clears venueId when subject does not own the supported venue", () => {
    const support: SupportSessionPayload = {
      staffUserId: "staff-1",
      subjectUserId: "venue-user",
      entityType: "venue",
      entityId: "venue-other",
      label: "Other",
      exp: Date.now() + 60_000,
    };
    const overlay = applySupportOverlay(staff, support, subjectVenue);
    expect(overlay.venueId).toBeNull();
    expect(overlay.venueVerified).toBe(false);
  });
});
