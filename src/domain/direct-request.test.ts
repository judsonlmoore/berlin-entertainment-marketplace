import { describe, expect, it } from "vitest";
import {
  canEntertainerTransitionDirectRequest,
  canVenueTransitionDirectRequest,
} from "./direct-request";

describe("direct request transitions", () => {
  it("lets venues withdraw a pending request", () => {
    expect(canVenueTransitionDirectRequest("requested", "withdrawn")).toBe(
      true,
    );
  });

  it("lets entertainers accept or decline", () => {
    expect(canEntertainerTransitionDirectRequest("requested", "accepted")).toBe(
      true,
    );
    expect(canEntertainerTransitionDirectRequest("requested", "declined")).toBe(
      true,
    );
  });

  it("blocks venues from accepting their own request", () => {
    expect(canVenueTransitionDirectRequest("requested", "accepted")).toBe(
      false,
    );
  });
});
