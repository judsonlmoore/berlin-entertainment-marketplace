import { describe, expect, it } from "vitest";
import { can, type ActorContext } from "./permissions";

function actor(overrides: Partial<ActorContext> = {}): ActorContext {
  return {
    userId: "user-1",
    isPlatformStaff: false,
    accountStatus: "active",
    roles: ["entertainer"],
    entertainerVerified: true,
    venueVerified: false,
    venueId: null,
    ...overrides,
  };
}

describe("permissions", () => {
  it("denies marketplace discovery for suspended users", () => {
    expect(
      can(actor({ accountStatus: "suspended" }), "marketplace.discover"),
    ).toBe(false);
  });

  it("allows marketplace discovery for active users", () => {
    expect(can(actor(), "marketplace.discover")).toBe(true);
  });

  it("allows staff to change account status", () => {
    expect(
      can(
        actor({ isPlatformStaff: true, accountStatus: null, roles: [] }),
        "admin.change_approval",
      ),
    ).toBe(true);
  });

  it("denies venue manage when actor does not own the venue", () => {
    expect(
      can(
        actor({
          roles: ["venue"],
          venueId: "venue-other",
        }),
        "venue.manage",
        { venueId: "venue-1" },
      ),
    ).toBe(false);
  });

  it("allows venue operate for the venue owner", () => {
    expect(
      can(
        actor({
          roles: ["venue"],
          venueId: "venue-1",
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
          accountStatus: "suspended",
          roles: ["venue"],
          venueId: "venue-1",
        }),
        "venue.operate",
        { venueId: "venue-1" },
      ),
    ).toBe(false);
  });

  it("allows venue role holders to create venues when active", () => {
    expect(can(actor({ roles: ["venue"] }), "venue.create")).toBe(true);
    expect(
      can(
        actor({ roles: ["venue"], accountStatus: "suspended" }),
        "venue.create",
      ),
    ).toBe(false);
  });

  it("gates apply and respond on entertainer verification", () => {
    expect(can(actor({ roles: ["entertainer"] }), "opportunity.apply")).toBe(
      true,
    );
    expect(
      can(
        actor({ roles: ["entertainer"], entertainerVerified: false }),
        "opportunity.apply",
      ),
    ).toBe(false);
    expect(
      can(
        actor({ roles: ["entertainer"], entertainerVerified: false }),
        "direct_request.respond",
      ),
    ).toBe(false);
  });

  it("gates profile enquiry send and respond on published profiles", () => {
    expect(can(actor(), "profile_enquiry.send")).toBe(true);
    expect(
      can(actor({ entertainerVerified: false }), "profile_enquiry.send"),
    ).toBe(false);
    expect(
      can(
        actor({
          roles: ["venue"],
          entertainerVerified: false,
          venueVerified: true,
          venueId: "venue-1",
        }),
        "profile_enquiry.respond",
        { venueId: "venue-1" },
      ),
    ).toBe(true);
  });

  it("gates direct request send on venue verification", () => {
    expect(
      can(
        actor({
          roles: ["venue"],
          venueVerified: true,
          venueId: "venue-1",
        }),
        "direct_request.send",
        { venueId: "venue-1" },
      ),
    ).toBe(true);
    expect(
      can(
        actor({
          roles: ["venue"],
          venueVerified: false,
          venueId: "venue-1",
        }),
        "direct_request.send",
        { venueId: "venue-1" },
      ),
    ).toBe(false);
  });

  it("role-segregates entertainer vs venue discovery", () => {
    expect(can(actor({ roles: ["entertainer"] }), "discover.venues")).toBe(
      true,
    );
    expect(
      can(actor({ roles: ["entertainer"] }), "discover.entertainers"),
    ).toBe(false);

    expect(
      can(
        actor({
          roles: ["venue"],
          venueId: "venue-1",
        }),
        "discover.entertainers",
      ),
    ).toBe(true);
    expect(
      can(
        actor({
          roles: ["venue"],
          venueId: "venue-1",
        }),
        "discover.venues",
      ),
    ).toBe(false);

    expect(
      can(
        actor({ isPlatformStaff: true, accountStatus: null, roles: [] }),
        "discover.entertainers",
      ),
    ).toBe(true);
  });

  it("gates booking mutations behind marketplace access", () => {
    expect(can(actor(), "booking.propose_terms")).toBe(true);
    expect(
      can(actor({ accountStatus: "suspended" }), "booking.accept_terms"),
    ).toBe(false);
    expect(
      can(
        actor({
          roles: ["venue"],
          venueId: "venue-1",
        }),
        "booking.record_deposit",
        { venueId: "venue-1" },
      ),
    ).toBe(true);
  });
});
