import { describe, expect, it } from "vitest";
import { SandboxInvoiceProvider } from "./provider";
import { buildInvoicePdf } from "@/src/domain/invoice-pdf";

const sampleInput = {
  invoiceId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  bookingId: "11111111-1111-1111-1111-111111111111",
  locale: "en" as const,
  currency: "EUR",
  feeCents: 50000,
  performanceFormat: "Drag bingo",
  startsAtIso: "2026-09-01T18:00:00.000Z",
  endsAtIso: "2026-09-01T20:00:00.000Z",
  seller: {
    legalName: "Act GmbH",
    addressLine1: "Street 1",
    postalCode: "10115",
    city: "Berlin",
    countryCode: "DE",
    taxId: "DE123456789",
    invoiceEmail: "act@example.com",
    iban: "DE89370400440532013000",
    bic: "COBADEFFXXX",
  },
  buyer: {
    legalName: "Venue UG",
    addressLine1: "Street 2",
    postalCode: "10117",
    city: "Berlin",
    countryCode: "DE",
    invoiceEmail: "venue@example.com",
  },
};

describe("buildInvoicePdf", () => {
  it("builds an A4 PDF artifact", async () => {
    const bytes = await buildInvoicePdf(sampleInput);
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(Buffer.from(bytes.slice(0, 5)).toString("utf8")).toBe("%PDF-");
  }, 30_000);
});

describe("SandboxInvoiceProvider", () => {
  it("renders a PDF invoice artifact", async () => {
    const provider = new SandboxInvoiceProvider();
    const result = await provider.generate(sampleInput);
    expect(result.format).toBe("sandbox_pdf");
    expect(result.contentType).toBe("application/pdf");
    expect(result.filename).toMatch(/\.pdf$/);
    expect(result.bytes.byteLength).toBeGreaterThan(1000);
    expect(result.validationNotes).toBe("sandbox_specimen_pdf");
  }, 30_000);
});
