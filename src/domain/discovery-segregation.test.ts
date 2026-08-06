import { describe, expect, it } from "vitest";
import { can, type ActorContext } from "@/src/domain/permissions";

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

describe("role-segregated discovery surfaces", () => {
  it("blocks entertainer-only users from entertainer list permission", () => {
    const a = actor({ roles: ["entertainer"] });
    expect(can(a, "marketplace.discover")).toBe(true);
    expect(can(a, "discover.entertainers")).toBe(false);
    expect(can(a, "discover.venues")).toBe(true);
  });

  it("blocks venue-only users from venue list permission", () => {
    const a = actor({
      roles: ["venue"],
      venueId: "v1",
    });
    expect(can(a, "marketplace.discover")).toBe(true);
    expect(can(a, "discover.entertainers")).toBe(true);
    expect(can(a, "discover.venues")).toBe(false);
  });

  it("treats owned venueId as venue operator for act discovery", () => {
    const a = actor({
      roles: [],
      venueId: "v1",
    });
    expect(can(a, "discover.entertainers")).toBe(true);
    expect(can(a, "discover.venues")).toBe(false);
  });
});
