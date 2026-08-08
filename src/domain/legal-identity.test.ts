import { describe, expect, it } from "vitest";
import {
  isLegalIdentityComplete,
  type LegalIdentityFields,
} from "./legal-identity";

const base: LegalIdentityFields = {
  entityType: "individual",
  legalName: "Ada Lovelace",
  tradingName: null,
  addressLine1: "Unter den Linden 1",
  addressLine2: null,
  postalCode: "10117",
  city: "Berlin",
  countryCode: "DE",
  taxId: null,
  companyRegisterId: null,
  invoiceEmail: "ada@example.com",
  iban: null,
  bic: null,
  paymentNote: null,
};

describe("legal-identity", () => {
  it("accepts complete individual without tax id", () => {
    expect(isLegalIdentityComplete(base)).toBe(true);
  });

  it("requires tax id for DE freelancer", () => {
    expect(
      isLegalIdentityComplete({
        ...base,
        entityType: "freelancer",
        taxId: null,
      }),
    ).toBe(false);
    expect(
      isLegalIdentityComplete({
        ...base,
        entityType: "freelancer",
        taxId: "DE123",
      }),
    ).toBe(true);
  });

  it("rejects incomplete address", () => {
    expect(isLegalIdentityComplete({ ...base, city: "" })).toBe(false);
    expect(isLegalIdentityComplete(null)).toBe(false);
  });
});
