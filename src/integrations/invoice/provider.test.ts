import { describe, expect, it } from "vitest";
import { SandboxInvoiceProvider } from "./provider";

describe("SandboxInvoiceProvider", () => {
  it("renders a plain-text invoice artifact", async () => {
    const provider = new SandboxInvoiceProvider();
    const result = await provider.generate({
      invoiceId: "inv-1",
      bookingId: "11111111-1111-1111-1111-111111111111",
      locale: "en",
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
        invoiceEmail: "act@example.com",
      },
      buyer: {
        legalName: "Venue UG",
        addressLine1: "Street 2",
        postalCode: "10117",
        city: "Berlin",
        countryCode: "DE",
        invoiceEmail: "venue@example.com",
      },
    });
    expect(result.format).toBe("sandbox_txt");
    expect(new TextDecoder().decode(result.bytes)).toContain("500.00 EUR");
    expect(result.validationNotes).toBe("sandbox_only");
  });
});
