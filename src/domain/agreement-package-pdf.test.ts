import { describe, expect, it } from "vitest";
import {
  fingerprintPdfBytes,
  normalizeAgreementBody,
  pairParagraphs,
  splitParagraphs,
  stripSandboxLines,
  truncateFingerprint,
} from "./agreement-package-pdf";
import {
  expectedConfirmationPhrase,
  matchesConfirmationPhrase,
} from "./agreement-confirm";

describe("splitParagraphs / pairParagraphs", () => {
  it("splits on blank lines and pairs DE/EN", () => {
    const de = splitParagraphs("Eins.\n\nZwei.\n\nDrei.");
    const en = splitParagraphs("One.\n\nTwo.");
    expect(de).toEqual(["Eins.", "Zwei.", "Drei."]);
    expect(pairParagraphs(de, en)).toEqual([
      { de: "Eins.", en: "One." },
      { de: "Zwei.", en: "Two." },
      { de: "Drei.", en: "" },
    ]);
  });

  it("strips SANDBOX banner lines and normalizes single-newline bodies", () => {
    expect(
      stripSandboxLines(
        "SANDBOX — kein rechtsverbindliches Dokument.\nLeistung: Abend.",
      ),
    ).toBe("Leistung: Abend.");
    expect(
      normalizeAgreementBody("SANDBOX — demo.\nLeistung: A.\nHonorar: B."),
    ).toBe("Leistung: A.\n\nHonorar: B.");
  });
});

describe("fingerprintPdfBytes", () => {
  it("hashes bytes stably", () => {
    const a = fingerprintPdfBytes(new Uint8Array([1, 2, 3]));
    const b = fingerprintPdfBytes(new Uint8Array([1, 2, 3]));
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(truncateFingerprint(a, 16)).toHaveLength(16);
  });
});

describe("confirmation phrase", () => {
  it("matches locale phrases case-insensitively", () => {
    expect(expectedConfirmationPhrase("en")).toBe("I agree");
    expect(expectedConfirmationPhrase("de")).toBe("Ich stimme zu");
    expect(matchesConfirmationPhrase("  I AGREE ", "en")).toBe(true);
    expect(matchesConfirmationPhrase("ich stimme zu", "de")).toBe(true);
    expect(matchesConfirmationPhrase("yes", "en")).toBe(false);
  });
});

describe("buildAgreementPackagePdf", () => {
  it("builds a cover + bilingual PDF with fingerprint and pages", async () => {
    const { buildAgreementPackagePdf } =
      await import("./agreement-package-pdf");
    const result = await buildAgreementPackagePdf({
      agreementId: "11111111-2222-3333-4444-555555555555",
      actName: "Dave Matthews Band",
      venueName: "Electric Social",
      termsVersion: 3,
      germanBody:
        "SANDBOX — skip.\n\nErster Absatz auf Deutsch.\n\nZweiter Absatz mit Ümlauten.",
      englishBody: "First English paragraph.\n\nSecond English paragraph.",
      addenda: [],
    });
    expect(result.bytes.byteLength).toBeGreaterThan(1000);
    expect(result.fingerprint).toHaveLength(64);
    expect(result.pageCount).toBeGreaterThanOrEqual(2);
  }, 30_000);

  it("embeds readable addendum PDFs and notes unreadable ones", async () => {
    const { PDFDocument } = await import("pdf-lib");
    const { buildAgreementPackagePdf } =
      await import("./agreement-package-pdf");

    const { StandardFonts } = await import("pdf-lib");
    const addendumDoc = await PDFDocument.create();
    const font = await addendumDoc.embedFont(StandardFonts.Helvetica);
    const page = addendumDoc.addPage([400, 400]);
    page.drawText("Rider page", { x: 40, y: 350, size: 12, font });
    const goodBytes = await addendumDoc.save();

    const result = await buildAgreementPackagePdf({
      agreementId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      actName: "Act",
      venueName: "Venue",
      termsVersion: 1,
      germanBody: "DE body.",
      englishBody: "EN body.",
      addenda: [
        {
          addendumNumber: 1,
          title: "Technical rider",
          pdfBytes: goodBytes,
        },
        {
          addendumNumber: 2,
          title: "Corrupt rider",
          pdfBytes: new Uint8Array([1, 2, 3, 4]),
        },
      ],
    });

    // cover + body + 2 banners + embedded page + unreadable note
    expect(result.pageCount).toBeGreaterThanOrEqual(5);
    expect(result.bytes.byteLength).toBeGreaterThan(2000);
  }, 30_000);
});
