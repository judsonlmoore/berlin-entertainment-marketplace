import { describe, expect, it } from "vitest";
import {
  PROFILE_OFFER_EXPIRY_DAYS,
  isProfileOfferExpired,
  profileOfferDaysRemaining,
  profileOfferExpiresAt,
} from "./profile-offer-expiry";

describe("profile offer expiry", () => {
  const sentAt = new Date("2026-08-01T12:00:00.000Z");

  it(`expires after ${PROFILE_OFFER_EXPIRY_DAYS} days`, () => {
    expect(
      isProfileOfferExpired(sentAt, new Date("2026-08-07T11:59:00.000Z")),
    ).toBe(false);
    expect(
      isProfileOfferExpired(sentAt, new Date("2026-08-08T12:00:00.000Z")),
    ).toBe(true);
  });

  it("reports remaining whole days while open", () => {
    expect(
      profileOfferDaysRemaining(sentAt, new Date("2026-08-01T12:00:00.000Z")),
    ).toBe(7);
    expect(
      profileOfferDaysRemaining(sentAt, new Date("2026-08-07T13:00:00.000Z")),
    ).toBe(1);
    expect(
      profileOfferDaysRemaining(sentAt, new Date("2026-08-08T12:00:00.000Z")),
    ).toBe(0);
  });

  it("computes expiry end from send time", () => {
    expect(profileOfferExpiresAt(sentAt).toISOString()).toBe(
      "2026-08-08T12:00:00.000Z",
    );
  });
});
