import { describe, expect, it } from "vitest";
import { projectLeadStatus } from "./lead";

describe("projectLeadStatus", () => {
  it("maps pending and open booking states", () => {
    expect(projectLeadStatus({ bookingState: "applied" })).toBe("pending");
    expect(projectLeadStatus({ bookingState: "requested" })).toBe("pending");
    expect(projectLeadStatus({ bookingState: "shortlisted" })).toBe("open");
    expect(projectLeadStatus({ bookingState: "accepted" })).toBe("open");
    expect(projectLeadStatus({ bookingState: "terms_agreed" })).toBe("open");
  });

  it("maps won and completed from confirmed", () => {
    const now = new Date("2026-08-01T12:00:00Z");
    expect(
      projectLeadStatus({
        bookingState: "confirmed",
        performanceEndsAt: new Date("2026-09-01T12:00:00Z"),
        now,
      }),
    ).toBe("won");
    expect(
      projectLeadStatus({
        bookingState: "confirmed",
        performanceEndsAt: new Date("2026-07-01T12:00:00Z"),
        now,
      }),
    ).toBe("completed");
    expect(projectLeadStatus({ bookingState: "confirmed", now })).toBe("won");
  });

  it("maps terminal states to lost", () => {
    expect(projectLeadStatus({ bookingState: "rejected" })).toBe("lost");
    expect(projectLeadStatus({ bookingState: "declined" })).toBe("lost");
    expect(projectLeadStatus({ bookingState: "withdrawn" })).toBe("lost");
  });
});
