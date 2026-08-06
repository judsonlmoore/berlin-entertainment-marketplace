import { describe, expect, it } from "vitest";
import type { ActorContext } from "@/src/domain/permissions";
import { applySupportOverlay } from "@/src/lib/support-overlay";
import type { SupportSessionPayload } from "@/src/lib/support-session";

const staff: ActorContext = {
  userId: "staff-1",
  isPlatformStaff: true,
  accountStatus: "active",
  roles: [],
  entertainerVerified: false,
  venueVerified: false,
  venueMemberships: [],
};

const subjectEntertainer: ActorContext = {
  userId: "act-user",
  isPlatformStaff: false,
  accountStatus: "active",
  roles: ["entertainer"],
  entertainerVerified: true,
  venueVerified: false,
  venueMemberships: [],
};

const subjectVenue: ActorContext = {
  userId: "venue-user",
  isPlatformStaff: false,
  accountStatus: "active",
  roles: ["venue"],
  entertainerVerified: false,
  venueVerified: true,
  venueMemberships: [
    { venueId: "venue-1", role: "owner", status: "active" },
    { venueId: "venue-2", role: "member", status: "active" },
  ],
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
    expect(overlay.venueMemberships).toEqual([]);
  });

  it("scopes venue memberships to the supported venue", () => {
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
    expect(overlay.roles).toEqual(["venue"]);
    expect(overlay.venueMemberships).toEqual([
      { venueId: "venue-1", role: "owner", status: "active" },
    ]);
  });
});
