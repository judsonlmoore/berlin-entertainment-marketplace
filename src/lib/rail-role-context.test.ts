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
    venueId: null,
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
          venueId: "v1",
        }),
      ),
    ).toBe("venue");
  });

  it("returns venue for owners with venueId only", () => {
    expect(
      resolveEffectiveRoleMode(
        actor({
          roles: [],
          venueId: "v1",
        }),
      ),
    ).toBe("venue");
  });
});
