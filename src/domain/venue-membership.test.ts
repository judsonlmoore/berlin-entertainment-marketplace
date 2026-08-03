import { describe, expect, it } from "vitest";
import { canRemoveMembership, countActiveOwners } from "./venue-membership";

describe("venue membership", () => {
  const memberships = [
    {
      id: "m1",
      userId: "u1",
      role: "owner" as const,
      status: "active" as const,
    },
    {
      id: "m2",
      userId: "u2",
      role: "member" as const,
      status: "active" as const,
    },
  ];

  it("counts active owners", () => {
    expect(countActiveOwners(memberships)).toBe(1);
  });

  it("allows removing a member", () => {
    expect(canRemoveMembership(memberships, "m2")).toEqual({ ok: true });
  });

  it("blocks removing the last active owner", () => {
    expect(canRemoveMembership(memberships, "m1")).toEqual({
      ok: false,
      reason: "last_owner",
    });
  });

  it("allows removing an owner when another active owner remains", () => {
    expect(
      canRemoveMembership(
        [
          ...memberships,
          {
            id: "m3",
            userId: "u3",
            role: "owner",
            status: "active",
          },
        ],
        "m1",
      ),
    ).toEqual({ ok: true });
  });
});
