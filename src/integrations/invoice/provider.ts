/**
 * InvoiceProvider boundary — sandbox first; production DE path targets @jasy/zugferd.
 * Salon never processes payments.
 */

export type InvoicePartySnapshot = {
  legalName: string;
  tradingName?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  postalCode: string;
  city: string;
  countryCode: string;
  taxId?: string | null;
  invoiceEmail: string;
  iban?: string | null;
  paymentNote?: string | null;
};

export type InvoiceGenerateInput = {
  invoiceId: string;
  bookingId: string;
  locale: "en" | "de";
  currency: string;
  feeCents: number;
  performanceFormat: string;
  startsAtIso: string;
  endsAtIso: string;
  seller: InvoicePartySnapshot;
  buyer: InvoicePartySnapshot;
};

export type InvoiceGenerateResult = {
  format: string;
  /** UTF-8 text/plain or PDF bytes as base64 for sandbox Blob upload. */
  bytes: Uint8Array;
  contentType: string;
  filename: string;
  validationNotes?: string;
};

export interface InvoiceProvider {
  readonly name: string;
  generate(input: InvoiceGenerateInput): Promise<InvoiceGenerateResult>;
}

export class SandboxInvoiceProvider implements InvoiceProvider {
  readonly name = "sandbox";

  async generate(input: InvoiceGenerateInput): Promise<InvoiceGenerateResult> {
    const fee = (input.feeCents / 100).toFixed(2);
    const lines = [
      "SALON SANDBOX INVOICE",
      "Not a production tax document.",
      "",
      `Invoice id: ${input.invoiceId}`,
      `Booking: ${input.bookingId}`,
      `Locale: ${input.locale}`,
      "",
      "SELLER",
      input.seller.legalName,
      input.seller.addressLine1,
      `${input.seller.postalCode} ${input.seller.city}`,
      input.seller.countryCode,
      input.seller.taxId ? `Tax: ${input.seller.taxId}` : "",
      input.seller.invoiceEmail,
      input.seller.iban ? `IBAN: ${input.seller.iban}` : "",
      input.seller.paymentNote ?? "",
      "",
      "BUYER",
      input.buyer.legalName,
      input.buyer.addressLine1,
      `${input.buyer.postalCode} ${input.buyer.city}`,
      input.buyer.countryCode,
      input.buyer.taxId ? `Tax: ${input.buyer.taxId}` : "",
      input.buyer.invoiceEmail,
      "",
      "SERVICE",
      input.performanceFormat,
      `${input.startsAtIso} → ${input.endsAtIso}`,
      `Fee: ${fee} ${input.currency}`,
      "",
      "Salon does not collect, hold, or route this payment.",
    ]
      .filter((line) => line !== undefined)
      .join("\n");

    return {
      format: "sandbox_txt",
      bytes: new TextEncoder().encode(lines),
      contentType: "text/plain; charset=utf-8",
      filename: `salon-invoice-${input.bookingId.slice(0, 8)}.txt`,
      validationNotes: "sandbox_only",
    };
  }
}

export function getInvoiceProvider(): InvoiceProvider {
  return new SandboxInvoiceProvider();
}
