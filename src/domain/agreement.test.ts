import { describe, expect, it } from "vitest";
import {
  canGenerateAgreement,
  renderAgreementDocuments,
  signatureProgress,
  bookingDocumentsLocked,
} from "./agreement";

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
});
