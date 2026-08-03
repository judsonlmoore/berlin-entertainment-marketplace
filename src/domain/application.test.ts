import { describe, expect, it } from "vitest";
import {
  canApplicantTransitionApplication,
  canVenueTransitionApplication,
  unlocksContactOnApplicationTransition,
} from "./application";

describe("application transitions", () => {
  it("lets applicants submit or withdraw drafts", () => {
    expect(canApplicantTransitionApplication("draft", "submitted")).toBe(true);
    expect(canApplicantTransitionApplication("draft", "withdrawn")).toBe(true);
  });

  it("lets applicants withdraw submitted and clarification applications", () => {
    expect(canApplicantTransitionApplication("submitted", "withdrawn")).toBe(
      true,
    );
    expect(
      canApplicantTransitionApplication("clarification_requested", "withdrawn"),
    ).toBe(true);
  });

  it("lets applicants reply to clarification by resubmitting", () => {
    expect(
      canApplicantTransitionApplication(
        "clarification_requested",
        "submitted",
      ),
    ).toBe(true);
  });

  it("lets venues shortlist, reject, or request clarification", () => {
    expect(canVenueTransitionApplication("submitted", "shortlisted")).toBe(
      true,
    );
    expect(canVenueTransitionApplication("submitted", "rejected")).toBe(true);
    expect(
      canVenueTransitionApplication("submitted", "clarification_requested"),
    ).toBe(true);
  });

  it("lets venues act on clarification_requested applications", () => {
    expect(
      canVenueTransitionApplication(
        "clarification_requested",
        "shortlisted",
      ),
    ).toBe(true);
    expect(
      canVenueTransitionApplication(
        "clarification_requested",
        "clarification_requested",
      ),
    ).toBe(false);
  });

  it("blocks applicants from shortlisting themselves", () => {
    expect(canApplicantTransitionApplication("submitted", "shortlisted")).toBe(
      false,
    );
  });

  it("does not unlock contact on clarification", () => {
    expect(unlocksContactOnApplicationTransition("clarification_requested")).toBe(
      false,
    );
    expect(unlocksContactOnApplicationTransition("shortlisted")).toBe(true);
  });
});
