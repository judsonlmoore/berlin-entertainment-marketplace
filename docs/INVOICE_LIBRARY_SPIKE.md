# Invoice library spike (negotiations / contract package)

Generated: 2026-08-07  
Branch context: negotiations → contract package roadmap  
Status: Spike complete — recommendation locked for Phase 3–4

## Constraint

Salon generates **invoice artifacts** for parties. It does **not** collect, hold, escrow, route, or refund money. Deposit remains status-only. Card numbers are never stored.

## Candidates evaluated

| Library | Strengths | Risks |
|---------|-----------|--------|
| **@jasy/zugferd** (+ @jasy/pdf) | Pure TS EN 16931 / ZUGFeRD / XRechnung; local validation; PDF/A-3 without LibreOffice | EU-focused; world formats need a separate human PDF path |
| **@e-invoice-eu/core** | Factur-X / UBL / CII / XRechnung; mature JSON mapping | PDF-from-spreadsheet needs LibreOffice in some paths |
| pdf-lib / React-PDF only | Simple human-readable PDF anywhere | No EN 16931 compliance for DE B2B |

## Recommendation

1. **DE / EU path:** `@jasy/zugferd` as `InvoiceProvider` implementation for EN 16931 hybrid PDF+XML after `confirmed`.
2. **Convenience / non-EU path:** Human-readable PDF via existing private Blob + pdf-lib (or jasy PDF layout) with locale EN/DE strings; same field model.
3. **Abstraction:** `InvoiceProvider` in `src/integrations/invoice/` mirroring `ESignProvider` — sandbox first, no production legal claims until counsel review.

## Required seller / buyer fields (feeds Phase 3 account schema)

| Field | Individual | Freelancer | Registered business | Notes |
|-------|------------|------------|---------------------|-------|
| `entityType` | required | required | required | enum |
| `legalName` | required | required | required | Natural person or company |
| `tradingName` | optional | optional | optional | DBA |
| `addressLine1` | required | required | required | |
| `addressLine2` | optional | optional | optional | |
| `postalCode` | required | required | required | |
| `city` | required | required | required | |
| `countryCode` | required | required | required | ISO 3166-1 alpha-2 |
| `taxId` | optional | often required (DE USt-IdNr / Steuernummer) | required for VAT invoices | Country-dependent |
| `companyRegisterId` | n/a | optional | optional (DE Handelsregister) | |
| `invoiceEmail` | required | required | required | May differ from login email |
| `iban` | optional | optional | optional | Payee instruction only — not processed |
| `bic` | optional | optional | optional | With IBAN |
| `paymentNote` | optional | optional | optional | Free-text “pay by bank transfer to…” |

**Completeness for Generate agreement:** both parties must have `entityType`, `legalName`, address fields, `countryCode`, `invoiceEmail`. Tax ID required when `countryCode` is `DE` and `entityType` is `freelancer` or `registered_business` (MVP rule; refine with counsel).

**Privacy:** Counterparty legal/payment fields visible only at/after `terms_agreed`. Own fields always editable on `/profile` and shown on negotiation for self.

## Negotiation checklist gates (before Generate agreement)

1. Commercial terms complete (dates or explicit undated waiver if product allows; fee; format; cancellation; production).
2. Both parties’ legal identity complete per table above.
3. At least empty addenda list allowed; package still generates with “no addenda” clause.

## Invoice after confirm

- Default direction MVP: **talent (seller) → venue (buyer)** using fee from immutable terms.
- Optional generate CTA on booking when `confirmed`.
- Store Blob key + format + validation status on `booking_invoices` row.
- Never trigger payouts.

## Out of scope for this spike

PEPPOL network submission, tax authority filing, multi-currency FX, agency intermediary invoices, automatic recurring invoices.
