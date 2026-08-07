import { describe, expect, it } from "vitest";
import {
  canGenerateAgreement,
  canGenerateBookingInvoice,
  canRebuildAgreementPackage,
  isBookingArtifactParty,
  nextBookingStateAfterSignatures,
  renderAgreementDocuments,
  signatureProgress,
  bookingDocumentsLocked,
} from "./agreement";
import { canActorTransitionBooking, canTransitionBooking } from "./booking";

describe("agreement domain", () => {
  it("locks booking documents once the agreement package exists", () => {
    expect(bookingDocumentsLocked("terms_agreed")).toBe(false);
    expect(bookingDocumentsLocked("agreement_generated")).toBe(true);
    expect(bookingDocumentsLocked("partially_signed")).toBe(true);
    expect(bookingDocumentsLocked("confirmed")).toBe(true);
  });

  it("renders German controlling and English convenience text from one terms snapshot", () => {
    const rendered = renderAgreementDocuments({
      germanTemplate: {
        version: "de-sandbox-1",
        legalReviewStatus: "sandbox",
        body: "DE {{venueName}} / {{actName}} / {{fee}}",
      },
      englishTemplate: {
        version: "en-sandbox-1",
        legalReviewStatus: "sandbox",
        body: "EN {{venueName}} / {{actName}} / {{fee}}",
      },
      terms: {
        actName: "Kiez Quartet",
        venueName: "Neukölln Room",
        startsAtIso: "2026-09-01T18:00:00.000Z",
        endsAtIso: "2026-09-01T20:00:00.000Z",
        timezone: "Europe/Berlin",
        feeCents: 45000,
        currency: "EUR",
        performanceFormat: "chamber",
        cancellationTerms: "50%",
        productionObligations: "PA",
        depositTerms: null,
        termsVersion: 1,
      },
    });

    expect(rendered.germanControlling).toBe(true);
    expect(rendered.germanBody).toContain("450.00 EUR");
    expect(rendered.englishBody).toContain("Kiez Quartet");
    expect(rendered.germanBody).not.toMatch(/T18:00:00/);
    expect(rendered.germanTemplateVersion).toBe("de-sandbox-1");
  });

  it("only allows generation after terms_agreed", () => {
    expect(canGenerateAgreement("terms_agreed")).toBe(true);
    expect(canGenerateAgreement("shortlisted")).toBe(false);
    expect(canGenerateAgreement("agreement_generated")).toBe(false);
    expect(canGenerateAgreement("confirmed")).toBe(false);
  });

  it("blocks package rebuild after any signature is signed", () => {
    expect(
      canRebuildAgreementPackage([
        { status: "pending" },
        { status: "pending" },
      ]),
    ).toBe(true);
    expect(
      canRebuildAgreementPackage([
        { status: "signed" },
        { status: "pending" },
      ]),
    ).toBe(false);
    expect(
      canRebuildAgreementPackage([
        { status: "signed" },
        { status: "signed" },
      ]),
    ).toBe(false);
  });

  it("gates invoice generation on confirmed only", () => {
    expect(canGenerateBookingInvoice("confirmed")).toBe(true);
    expect(canGenerateBookingInvoice("partially_signed")).toBe(false);
    expect(canGenerateBookingInvoice("terms_agreed")).toBe(false);
  });

  it("tracks signature progress", () => {
    expect(signatureProgress({ signatures: [] })).toBe("none");
    expect(
      signatureProgress({
        signatures: [{ status: "pending" }, { status: "signed" }],
      }),
    ).toBe("partial");
    expect(
      signatureProgress({
        signatures: [{ status: "signed" }, { status: "signed" }],
      }),
    ).toBe("complete");
  });

  it("maps dual-sign progress onto booking transitions (idempotent when done)", () => {
    expect(
      nextBookingStateAfterSignatures({
        bookingState: "agreement_generated",
        progress: "partial",
      }),
    ).toBe("partially_signed");
    expect(
      nextBookingStateAfterSignatures({
        bookingState: "partially_signed",
        progress: "complete",
      }),
    ).toBe("confirmed");
    expect(
      nextBookingStateAfterSignatures({
        bookingState: "agreement_generated",
        progress: "complete",
      }),
    ).toBe("confirmed");
    expect(
      nextBookingStateAfterSignatures({
        bookingState: "partially_signed",
        progress: "partial",
      }),
    ).toBeNull();
    expect(
      nextBookingStateAfterSignatures({
        bookingState: "confirmed",
        progress: "complete",
      }),
    ).toBeNull();

    expect(
      canTransitionBooking("agreement_generated", "partially_signed"),
    ).toBe(true);
    expect(canTransitionBooking("partially_signed", "confirmed")).toBe(true);
    expect(
      canActorTransitionBooking(
        "partially_signed",
        "confirmed",
        "system",
      ),
    ).toBe(true);
    expect(
      canActorTransitionBooking("partially_signed", "confirmed", "venue"),
    ).toBe(false);
  });

  it("authorizes artifact download for parties and staff only", () => {
    expect(
      isBookingArtifactParty({
        isPlatformStaff: true,
        bookingVenueId: "v1",
        bookingEntertainerProfileId: "p1",
      }),
    ).toBe(true);
    expect(
      isBookingArtifactParty({
        isPlatformStaff: false,
        actorVenueId: "v1",
        bookingVenueId: "v1",
        bookingEntertainerProfileId: "p1",
      }),
    ).toBe(true);
    expect(
      isBookingArtifactParty({
        isPlatformStaff: false,
        actorEntertainerProfileId: "p1",
        bookingVenueId: "v1",
        bookingEntertainerProfileId: "p1",
      }),
    ).toBe(true);
    expect(
      isBookingArtifactParty({
        isPlatformStaff: false,
        actorUserId: "u1",
        bookingVenueId: "v1",
        bookingEntertainerUserId: "u1",
      }),
    ).toBe(true);
    expect(
      isBookingArtifactParty({
        isPlatformStaff: false,
        actorVenueId: "other",
        actorEntertainerProfileId: "other",
        actorUserId: "other",
        bookingVenueId: "v1",
        bookingEntertainerProfileId: "p1",
        bookingEntertainerUserId: "u1",
      }),
    ).toBe(false);
  });
});
