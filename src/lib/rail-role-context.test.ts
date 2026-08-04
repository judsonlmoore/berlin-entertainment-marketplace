import { describe, expect, it } from "vitest";
import { resolveEffectiveRoleMode } from "@/src/lib/rail-role-context";
import type { ActorContext } from "@/src/domain/permissions";

function actor(partial: Partial<ActorContext>): ActorContext {
  return {
    userId: "user-1",
    isPlatformStaff: false,
    approvalState: "approved",
    roles: [],
    activeRoleMode: null,
    venueMemberships: [],
    ...partial,
  };
}

describe("resolveEffectiveRoleMode", () => {
  it("returns entertainer for act-only accounts", () => {
    expect(
      resolveEffectiveRoleMode(
        actor({ roles: ["entertainer"], activeRoleMode: null }),
      ),
    ).toBe("entertainer");
  });

  it("returns venue for venue-only accounts", () => {
    expect(
      resolveEffectiveRoleMode(
        actor({
          roles: ["venue"],
          activeRoleMode: null,
          venueMemberships: [
            { venueId: "v1", role: "owner", status: "active" },
          ],
        }),
      ),
    ).toBe("venue");
  });

  it("honors explicit dual-role mode", () => {
    expect(
      resolveEffectiveRoleMode(
        actor({
          roles: ["entertainer", "venue"],
          activeRoleMode: "venue",
          venueMemberships: [
            { venueId: "v1", role: "owner", status: "active" },
          ],
        }),
      ),
    ).toBe("venue");
  });

  it("defaults dual-role without mode to entertainer", () => {
    expect(
      resolveEffectiveRoleMode(
        actor({
          roles: ["entertainer", "venue"],
          activeRoleMode: null,
          venueMemberships: [
            { venueId: "v1", role: "owner", status: "active" },
          ],
        }),
      ),
    ).toBe("entertainer");
  });
});
