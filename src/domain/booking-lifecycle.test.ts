import { describe, expect, it } from "vitest";
import { bookingLifecycleSteps } from "./booking-lifecycle";

describe("booking lifecycle track", () => {
  it("marks terms_agreed as current after shortlist/accept", () => {
    const steps = bookingLifecycleSteps("terms_agreed");
    expect(steps.find((s) => s.id === "shortlisted_or_accepted")?.status).toBe(
      "complete",
    );
    expect(steps.find((s) => s.id === "terms_agreed")?.status).toBe("current");
    expect(steps.find((s) => s.id === "confirmed")?.status).toBe("upcoming");
  });

  it("treats terminal states as non-progress", () => {
    expect(
      bookingLifecycleSteps("cancelled").every((s) => s.status === "terminal"),
    ).toBe(true);
  });
});
