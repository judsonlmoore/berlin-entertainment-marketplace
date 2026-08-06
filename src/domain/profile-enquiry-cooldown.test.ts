import { describe, expect, it } from "vitest";
import {
  PROFILE_ENQUIRY_REQUEST_COOLDOWN_DAYS,
  enquiryRequestCooldownDaysRemaining,
  enquiryRequestCooldownUntil,
  isEnquiryRequestOnCooldown,
} from "./profile-enquiry-cooldown";

describe("profile enquiry request cooldown", () => {
  const requestedAt = new Date("2026-08-01T12:00:00.000Z");

  it(`blocks re-request for ${PROFILE_ENQUIRY_REQUEST_COOLDOWN_DAYS} days`, () => {
    expect(
      isEnquiryRequestOnCooldown(
        requestedAt,
        new Date("2026-08-06T12:00:00.000Z"),
      ),
    ).toBe(true);
    expect(
      isEnquiryRequestOnCooldown(
        requestedAt,
        new Date("2026-08-08T12:00:01.000Z"),
      ),
    ).toBe(false);
  });

  it("reports remaining whole days while on cooldown", () => {
    expect(
      enquiryRequestCooldownDaysRemaining(
        requestedAt,
        new Date("2026-08-06T12:00:00.000Z"),
      ),
    ).toBe(2);
    expect(
      enquiryRequestCooldownDaysRemaining(
        requestedAt,
        new Date("2026-08-07T18:00:00.000Z"),
      ),
    ).toBe(1);
    expect(
      enquiryRequestCooldownDaysRemaining(
        requestedAt,
        new Date("2026-08-08T12:00:01.000Z"),
      ),
    ).toBe(0);
  });

  it("computes cooldown end from request time", () => {
    expect(enquiryRequestCooldownUntil(requestedAt).toISOString()).toBe(
      "2026-08-08T12:00:00.000Z",
    );
  });
});
