import { describe, expect, it } from "vitest";
import { resolveEffectiveRoleMode } from "@/src/lib/rail-role-context";
import type { ActorContext } from "@/src/domain/permissions";

function actor(partial: Partial<ActorContext>): ActorContext {
  return {
    userId: "user-1",
    isPlatformStaff: false,
    accountStatus: "active",
    roles: [],
    entertainerVerified: false,
    venueVerified: false,
    venueMemberships: [],
    ...partial,
  };
}

describe("resolveEffectiveRoleMode", () => {
  it("returns entertainer for act-only accounts", () => {
    expect(resolveEffectiveRoleMode(actor({ roles: ["entertainer"] }))).toBe(
      "entertainer",
    );
  });

  it("returns venue for venue-only accounts", () => {
    expect(
      resolveEffectiveRoleMode(
        actor({
          roles: ["venue"],
          venueMemberships: [
            { venueId: "v1", role: "owner", status: "active" },
          ],
        }),
      ),
    ).toBe("venue");
  });

  it("returns venue for membership-only operators", () => {
    expect(
      resolveEffectiveRoleMode(
        actor({
          roles: [],
          venueMemberships: [
            { venueId: "v1", role: "member", status: "active" },
          ],
        }),
      ),
    ).toBe("venue");
  });
});
