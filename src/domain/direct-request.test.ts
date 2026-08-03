import { describe, expect, it } from "vitest";
import {
  canEntertainerTransitionDirectRequest,
  canSystemTransitionDirectRequest,
  canVenueTransitionDirectRequest,
  defaultResponseDeadlineAt,
  DIRECT_REQUEST_RESPONSE_DEADLINE_DAYS,
} from "./direct-request";

describe("direct request transitions", () => {
  it("lets venues withdraw a pending request", () => {
    expect(canVenueTransitionDirectRequest("requested", "withdrawn")).toBe(
      true,
    );
  });

  it("lets entertainers accept, decline, or propose changes", () => {
    expect(canEntertainerTransitionDirectRequest("requested", "accepted")).toBe(
      true,
    );
    expect(canEntertainerTransitionDirectRequest("requested", "declined")).toBe(
      true,
    );
    expect(
      canEntertainerTransitionDirectRequest("requested", "changes_proposed"),
    ).toBe(true);
  });

  it("lets venues accept or decline proposed changes", () => {
    expect(
      canVenueTransitionDirectRequest("changes_proposed", "accepted"),
    ).toBe(true);
    expect(
      canVenueTransitionDirectRequest("changes_proposed", "declined"),
    ).toBe(true);
    expect(
      canVenueTransitionDirectRequest("changes_proposed", "withdrawn"),
    ).toBe(true);
  });

  it("blocks venues from accepting their own initial request", () => {
    expect(canVenueTransitionDirectRequest("requested", "accepted")).toBe(
      false,
    );
  });

  it("lets the system expire overdue requested items", () => {
    expect(canSystemTransitionDirectRequest("requested", "expired")).toBe(true);
    expect(canSystemTransitionDirectRequest("changes_proposed", "expired")).toBe(
      false,
    );
  });

  it("defaults response deadline to seven days", () => {
    const from = new Date("2026-01-01T12:00:00.000Z");
    const deadline = defaultResponseDeadlineAt(from);
    expect(deadline.getTime() - from.getTime()).toBe(
      DIRECT_REQUEST_RESPONSE_DEADLINE_DAYS * 24 * 60 * 60 * 1000,
    );
  });
});
