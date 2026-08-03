import { describe, expect, it } from "vitest";
import {
  canActorTransitionBooking,
  canCancelBooking,
  canRecordDepositStatus,
  canTransitionBooking,
  depositAffectsBookingConfirmation,
  isTermsEligibleState,
  nextTermsVersion,
} from "./booking";

describe("booking state machine", () => {
  it("converges both origins into terms_agreed", () => {
    expect(isTermsEligibleState("shortlisted")).toBe(true);
    expect(isTermsEligibleState("accepted")).toBe(true);
    expect(canTransitionBooking("shortlisted", "terms_agreed")).toBe(true);
    expect(canTransitionBooking("accepted", "terms_agreed")).toBe(true);
  });

  it("allows venue or entertainer to drive terms_agreed", () => {
    expect(canActorTransitionBooking("accepted", "terms_agreed", "venue")).toBe(
      true,
    );
    expect(
      canActorTransitionBooking("shortlisted", "terms_agreed", "entertainer"),
    ).toBe(true);
    expect(
      canActorTransitionBooking("accepted", "terms_agreed", "system"),
    ).toBe(false);
  });

  it("blocks illegal jumps to confirmed", () => {
    expect(canTransitionBooking("accepted", "confirmed")).toBe(false);
    expect(canTransitionBooking("terms_agreed", "confirmed")).toBe(false);
    expect(canTransitionBooking("partially_signed", "confirmed")).toBe(true);
  });

  it("requires system for signature progression", () => {
    expect(
      canActorTransitionBooking(
        "agreement_generated",
        "partially_signed",
        "venue",
      ),
    ).toBe(false);
    expect(
      canActorTransitionBooking(
        "agreement_generated",
        "partially_signed",
        "system",
      ),
    ).toBe(true);
  });

  it("allows parties to cancel negotiable bookings", () => {
    expect(canCancelBooking("accepted", "venue")).toBe(true);
    expect(canCancelBooking("terms_agreed", "entertainer")).toBe(true);
    expect(canCancelBooking("declined", "venue")).toBe(false);
  });

  it("keeps deposit independent of confirmation", () => {
    expect(depositAffectsBookingConfirmation()).toBe(false);
    expect(canRecordDepositStatus("accepted", "pending")).toBe(true);
    expect(canRecordDepositStatus("confirmed", "received")).toBe(true);
    expect(canRecordDepositStatus("cancelled", "refunded")).toBe(true);
  });

  it("increments terms versions from null or current max", () => {
    expect(nextTermsVersion(null)).toBe(1);
    expect(nextTermsVersion(2)).toBe(3);
  });
});
