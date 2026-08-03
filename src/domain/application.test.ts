import { describe, expect, it } from "vitest";
import {
  canApplicantTransitionApplication,
  canVenueTransitionApplication,
} from "./application";

describe("application transitions", () => {
  it("lets applicants withdraw a submitted application", () => {
    expect(canApplicantTransitionApplication("submitted", "withdrawn")).toBe(
      true,
    );
  });

  it("lets venues shortlist or reject submitted applications", () => {
    expect(canVenueTransitionApplication("submitted", "shortlisted")).toBe(
      true,
    );
    expect(canVenueTransitionApplication("submitted", "rejected")).toBe(true);
  });

  it("blocks applicants from shortlisting themselves", () => {
    expect(canApplicantTransitionApplication("submitted", "shortlisted")).toBe(
      false,
    );
  });
});
