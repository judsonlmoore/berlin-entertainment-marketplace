import { describe, expect, it } from "vitest";
import { can, type ActorContext } from "./permissions";

function actor(overrides: Partial<ActorContext> = {}): ActorContext {
  return {
    userId: "user-1",
    isPlatformStaff: false,
    approvalState: "approved",
    roles: ["entertainer"],
    venueMemberships: [],
    ...overrides,
  };
}

describe("permissions", () => {
  it("denies marketplace discovery for unapproved users", () => {
    expect(
      can(actor({ approvalState: "applied" }), "marketplace.discover"),
    ).toBe(false);
  });

  it("allows marketplace discovery for approved users", () => {
    expect(can(actor(), "marketplace.discover")).toBe(true);
  });

  it("allows staff to change approval even when not marketplace-approved", () => {
    expect(
      can(
        actor({ isPlatformStaff: true, approvalState: null, roles: [] }),
        "admin.change_approval",
      ),
    ).toBe(true);
  });

  it("denies venue manage for non-owners", () => {
    expect(
      can(
        actor({
          roles: ["venue"],
          venueMemberships: [
            { venueId: "venue-1", role: "member", status: "active" },
          ],
        }),
        "venue.manage",
        { venueId: "venue-1" },
      ),
    ).toBe(false);
  });

  it("allows venue operate for active members", () => {
    expect(
      can(
        actor({
          roles: ["venue"],
          venueMemberships: [
            { venueId: "venue-1", role: "member", status: "active" },
          ],
        }),
        "venue.operate",
        { venueId: "venue-1" },
      ),
    ).toBe(true);
  });

  it("denies suspended users from venue operate", () => {
    expect(
      can(
        actor({
          approvalState: "suspended",
          roles: ["venue"],
          venueMemberships: [
            { venueId: "venue-1", role: "owner", status: "active" },
          ],
        }),
        "venue.operate",
        { venueId: "venue-1" },
      ),
    ).toBe(false);
  });

  it("allows venue role holders to create venues when not suspended", () => {
    expect(can(actor({ roles: ["venue"] }), "venue.create")).toBe(true);
    expect(
      can(
        actor({ roles: ["venue"], approvalState: "suspended" }),
        "venue.create",
      ),
    ).toBe(false);
  });

  it("allows approved entertainers to apply and venue operators to review", () => {
    expect(can(actor({ roles: ["entertainer"] }), "opportunity.apply")).toBe(
      true,
    );
    expect(
      can(
        actor({
          roles: ["venue"],
          venueMemberships: [
            { venueId: "venue-1", role: "owner", status: "active" },
          ],
        }),
        "application.review",
        { venueId: "venue-1" },
      ),
    ).toBe(true);
  });
});
