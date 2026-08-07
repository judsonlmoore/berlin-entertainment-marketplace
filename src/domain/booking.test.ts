import { describe, expect, it } from "vitest";
import {
  canActorTransitionBooking,
  canCancelBooking,
  canRecordDepositStatus,
  canTransitionBooking,
  depositAffectsBookingConfirmation,
  isOpenTermsOffer,
  isTermsEligibleState,
  nextTermsVersion,
  requireChangeNoteForVersion,
  resolveTermsOfferAction,
  openStateAfterPendingCounter,
} from "./booking";

describe("booking state machine", () => {
  it("converges both origins into terms_agreed", () => {
    expect(isTermsEligibleState("shortlisted")).toBe(true);
    expect(isTermsEligibleState("accepted")).toBe(true);
    expect(canTransitionBooking("shortlisted", "terms_agreed")).toBe(true);
    expect(canTransitionBooking("accepted", "terms_agreed")).toBe(true);
    expect(canTransitionBooking("applied", "terms_agreed")).toBe(true);
    expect(canTransitionBooking("requested", "terms_agreed")).toBe(true);
  });

  it("allows venue or entertainer to drive terms_agreed", () => {
    expect(canActorTransitionBooking("accepted", "terms_agreed", "venue")).toBe(
      true,
    );
    expect(
      canActorTransitionBooking("shortlisted", "terms_agreed", "entertainer"),
    ).toBe(true);
    expect(
      canActorTransitionBooking("applied", "terms_agreed", "venue"),
    ).toBe(true);
    expect(
      canActorTransitionBooking("requested", "terms_agreed", "entertainer"),
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

describe("offer / counter handshake", () => {
  it("treats only non-accepted non-superseded rows as open", () => {
    expect(isOpenTermsOffer({ acceptedAt: null, supersededAt: null })).toBe(
      true,
    );
    expect(
      isOpenTermsOffer({ acceptedAt: new Date(), supersededAt: null }),
    ).toBe(false);
    expect(
      isOpenTermsOffer({ acceptedAt: null, supersededAt: new Date() }),
    ).toBe(false);
  });

  it("requires change notes for counters only", () => {
    expect(requireChangeNoteForVersion(1, null)).toBe(true);
    expect(requireChangeNoteForVersion(1, "")).toBe(true);
    expect(requireChangeNoteForVersion(2, null)).toBe(false);
    expect(requireChangeNoteForVersion(2, "Later start")).toBe(true);
  });

  it("resolves compose / wait / respond from open offer ownership", () => {
    expect(
      resolveTermsOfferAction({
        bookingState: "accepted",
        actorUserId: "a",
        openOffer: null,
      }),
    ).toEqual({ kind: "compose" });

    expect(
      resolveTermsOfferAction({
        bookingState: "accepted",
        actorUserId: "a",
        openOffer: { id: "t1", proposedByUserId: "a" },
      }),
    ).toEqual({ kind: "wait" });

    expect(
      resolveTermsOfferAction({
        bookingState: "shortlisted",
        actorUserId: "a",
        openOffer: { id: "t1", proposedByUserId: "b" },
      }),
    ).toEqual({ kind: "respond", termsId: "t1" });

    expect(
      resolveTermsOfferAction({
        bookingState: "terms_agreed",
        actorUserId: "a",
        openOffer: null,
      }),
    ).toEqual({ kind: "none" });
  });

  it("allows pending profile-offer respond/wait without compose", () => {
    expect(
      resolveTermsOfferAction({
        bookingState: "applied",
        actorUserId: "venue",
        openOffer: { id: "t1", proposedByUserId: "act" },
        allowPendingOfferResponse: true,
      }),
    ).toEqual({ kind: "respond", termsId: "t1" });

    expect(
      resolveTermsOfferAction({
        bookingState: "requested",
        actorUserId: "venue",
        openOffer: { id: "t1", proposedByUserId: "venue" },
        allowPendingOfferResponse: true,
      }),
    ).toEqual({ kind: "wait" });

    expect(
      resolveTermsOfferAction({
        bookingState: "applied",
        actorUserId: "venue",
        openOffer: null,
        allowPendingOfferResponse: true,
      }),
    ).toEqual({ kind: "none" });

    expect(
      resolveTermsOfferAction({
        bookingState: "applied",
        actorUserId: "venue",
        openOffer: { id: "t1", proposedByUserId: "act" },
      }),
    ).toEqual({ kind: "none" });
  });

  it("maps pending counter to open booking states", () => {
    expect(openStateAfterPendingCounter("applied")).toBe("shortlisted");
    expect(openStateAfterPendingCounter("requested")).toBe("accepted");
    expect(openStateAfterPendingCounter("accepted")).toBe(null);
  });
});
