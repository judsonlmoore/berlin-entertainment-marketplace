/**
 * InvoiceProvider boundary — sandbox first; production DE path targets @jasy/zugferd.
 * Salon never processes payments.
 */

import { buildInvoicePdf } from "@/src/domain/invoice-pdf";

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
  bic?: string | null;
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
    const bytes = await buildInvoicePdf({
      ...input,
      vatRatePercent: 0,
    });

    return {
      format: "sandbox_pdf",
      bytes,
      contentType: "application/pdf",
      filename: `salon-invoice-${input.bookingId.slice(0, 8)}.pdf`,
      validationNotes: "sandbox_specimen_pdf",
    };
  }
}

export function getInvoiceProvider(): InvoiceProvider {
  return new SandboxInvoiceProvider();
}
