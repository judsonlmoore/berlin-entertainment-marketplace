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
    venueMemberships: [],
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
          accountStatus: "suspended",
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

  it("gates direct request send on venue verification", () => {
    expect(
      can(
        actor({
          roles: ["venue"],
          venueVerified: true,
          venueMemberships: [
            { venueId: "venue-1", role: "member", status: "active" },
          ],
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
          venueMemberships: [
            { venueId: "venue-1", role: "owner", status: "active" },
          ],
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
          venueMemberships: [
            { venueId: "venue-1", role: "owner", status: "active" },
          ],
        }),
        "discover.entertainers",
      ),
    ).toBe(true);
    expect(
      can(
        actor({
          roles: ["venue"],
          venueMemberships: [
            { venueId: "venue-1", role: "owner", status: "active" },
          ],
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
          venueMemberships: [
            { venueId: "venue-1", role: "owner", status: "active" },
          ],
        }),
        "booking.record_deposit",
        { venueId: "venue-1" },
      ),
    ).toBe(true);
  });
});
