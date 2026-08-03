# Salon — Berlin entertainment marketplace

Salon is a Berlin-first, bilingual private marketplace connecting venues with small-format entertainers. This repository contains an interactive MVP scaffold with a polished public landing page and realistic private workflow screens.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Then open the local URL printed by the development server. Validate changes with:

```bash
npm run typecheck
npm run lint
npm test
```

## What is scaffolded

- Manual access states: `applied`, `invited`, `approved`, `suspended`
- One identity with venue and entertainer roles; venue owner/member membership
- Venue and entertainer profile/onboarding surfaces with manual review messaging
- Private approved-member discovery; contacts unlock only after shortlist/acceptance
- Open opportunity applications and direct requests entering one booking pipeline
- Terms, German-controlling bilingual agreement and e-signature provider placeholders
- Calendar states: available, unavailable, expiring tentative hold, requested, confirmed
- Separate deposit status, explicitly independent from booking confirmation
- English default with German copy/catalog structure under `messages/`

The MVP intentionally excludes public listings, consumer event pages, in-product chat, reviews, escrow, payment custody, real legal-document generation, and live e-signature processing.

## Architecture

- **UI:** React 19 + TypeScript, Next-compatible App Router APIs, vinext/Vite build
- **Hosting target:** Cloudflare-compatible worker output
- **Styles:** Product-specific responsive CSS in `app/globals.css`
- **Domain model:** Workflow state types in `app/domain.ts`
- **Demo data:** Static, non-sensitive fixtures in `app/page.tsx`; no browser storage is used as authoritative data
- **Persistence path:** Add Cloudflare D1 for relational marketplace data and R2 for rider/portfolio uploads when moving beyond the demo. Bindings remain disabled in `.openai/hosting.json` so the scaffold is safe and zero-configuration locally.
- **Authentication path:** Keep the public landing route open, protect marketplace routes server-side, and map authenticated identities to approval status. The current interactive switch is a demo, not production authorization.

## Environment and deployment

Copy `.env.example` and keep real secrets out of Git. `ESIGN_PROVIDER=mock` is deliberate. For Cloudflare deployment, configure production values in the hosting environment, enable D1/R2 only when their migrations and access policies are ready, then run `npm run build`.

## Recommended next steps

1. Split the interactive prototype into public and protected App Router routes.
2. Implement server-side identity, organization membership, approval, and contact-unlock authorization.
3. Add a D1 schema/migrations for people, roles, venues, profiles, opportunities, applications, bookings, calendar blocks, agreements, signatures, and audit events.
4. Add R2 uploads with file validation and signed access for riders and portfolio media.
5. Connect a reviewed e-sign provider behind an adapter; obtain German legal review for controlling agreement text and the English convenience translation.
6. Add email notifications and external-contact handoff—without introducing in-product chat.

No claim is made that legal agreements, signatures, deposits, or payments are live in this scaffold.
