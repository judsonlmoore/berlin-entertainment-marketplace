import { describe, expect, it } from "vitest";
import {
  bookingContactsUnlocked,
  normalizeLeadStatusFilter,
  projectLeadStatus,
  resolveBookingNeedsAction,
} from "./lead";

describe("projectLeadStatus", () => {
  it("maps early and mid booking states to open", () => {
    expect(projectLeadStatus({ bookingState: "applied" })).toBe("open");
    expect(projectLeadStatus({ bookingState: "requested" })).toBe("open");
    expect(projectLeadStatus({ bookingState: "shortlisted" })).toBe("open");
    expect(projectLeadStatus({ bookingState: "accepted" })).toBe("open");
    expect(projectLeadStatus({ bookingState: "terms_agreed" })).toBe("open");
    expect(projectLeadStatus({ bookingState: "agreement_generated" })).toBe(
      "open",
    );
    expect(projectLeadStatus({ bookingState: "partially_signed" })).toBe(
      "open",
    );
  });

  it("maps confirmed and done from confirmed", () => {
    const now = new Date("2026-08-01T12:00:00Z");
    expect(
      projectLeadStatus({
        bookingState: "confirmed",
        performanceEndsAt: new Date("2026-09-01T12:00:00Z"),
        now,
      }),
    ).toBe("confirmed");
    expect(
      projectLeadStatus({
        bookingState: "confirmed",
        performanceEndsAt: new Date("2026-07-01T12:00:00Z"),
        now,
      }),
    ).toBe("done");
    expect(projectLeadStatus({ bookingState: "confirmed", now })).toBe(
      "confirmed",
    );
  });

  it("maps terminal states to lost", () => {
    expect(projectLeadStatus({ bookingState: "rejected" })).toBe("lost");
    expect(projectLeadStatus({ bookingState: "declined" })).toBe("lost");
    expect(projectLeadStatus({ bookingState: "withdrawn" })).toBe("lost");
    expect(projectLeadStatus({ bookingState: "expired" })).toBe("lost");
    expect(projectLeadStatus({ bookingState: "cancelled" })).toBe("lost");
  });
});

describe("bookingContactsUnlocked", () => {
  it("unlocks only after mutual interest", () => {
    expect(bookingContactsUnlocked("applied")).toBe(false);
    expect(bookingContactsUnlocked("requested")).toBe(false);
    expect(bookingContactsUnlocked("cancelled")).toBe(false);
    expect(bookingContactsUnlocked("shortlisted")).toBe(true);
    expect(bookingContactsUnlocked("accepted")).toBe(true);
    expect(bookingContactsUnlocked("terms_agreed")).toBe(true);
    expect(bookingContactsUnlocked("confirmed")).toBe(true);
  });
});

describe("normalizeLeadStatusFilter", () => {
  it("defaults to open and maps legacy values", () => {
    expect(normalizeLeadStatusFilter(undefined)).toBe("open");
    expect(normalizeLeadStatusFilter("pending")).toBe("open");
    expect(normalizeLeadStatusFilter("won")).toBe("confirmed");
    expect(normalizeLeadStatusFilter("completed")).toBe("done");
    expect(normalizeLeadStatusFilter("all")).toBe("all");
    expect(normalizeLeadStatusFilter("confirmed")).toBe("confirmed");
    expect(normalizeLeadStatusFilter("bogus")).toBe("open");
  });
});

describe("resolveBookingNeedsAction", () => {
  const base = {
    actorUserId: "actor-1",
    isVenueParty: false,
    isEntertainerParty: true,
    bookingState: "accepted" as const,
    originType: "profile_enquiry" as const,
    openOfferProposedByUserId: null as string | null,
    directRequestState: null as string | null,
    pendingSignatureForActor: false,
  };

  it("prioritizes pending signature", () => {
    expect(
      resolveBookingNeedsAction({
        ...base,
        pendingSignatureForActor: true,
        openOfferProposedByUserId: "other",
      }),
    ).toBe("sign");
  });

  it("detects offer respond turn", () => {
    expect(
      resolveBookingNeedsAction({
        ...base,
        openOfferProposedByUserId: "other-user",
      }),
    ).toBe("respond_offer");
    expect(
      resolveBookingNeedsAction({
        ...base,
        openOfferProposedByUserId: "actor-1",
      }),
    ).toBe(null);
  });

  it("detects pending profile offer respond", () => {
    expect(
      resolveBookingNeedsAction({
        ...base,
        bookingState: "requested",
        openOfferProposedByUserId: "other-user",
      }),
    ).toBe("respond_offer");
  });

  it("detects direct request respond", () => {
    expect(
      resolveBookingNeedsAction({
        ...base,
        originType: "direct_request",
        bookingState: "requested",
        directRequestState: "requested",
        isEntertainerParty: true,
      }),
    ).toBe("respond_request");
    expect(
      resolveBookingNeedsAction({
        ...base,
        originType: "direct_request",
        bookingState: "requested",
        directRequestState: "changes_proposed",
        isEntertainerParty: false,
        isVenueParty: true,
      }),
    ).toBe("respond_request");
  });

  it("detects venue application review", () => {
    expect(
      resolveBookingNeedsAction({
        ...base,
        originType: "application",
        bookingState: "applied",
        isEntertainerParty: false,
        isVenueParty: true,
      }),
    ).toBe("review_application");
  });
});
