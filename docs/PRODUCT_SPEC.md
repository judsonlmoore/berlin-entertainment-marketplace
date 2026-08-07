# Salon MVP Product Specification

Status: implementation source of truth  
Companion direction: [MARKETPLACE_REQUIREMENTS.md](./MARKETPLACE_REQUIREMENTS.md)  
Market: Berlin, Germany  
Default locale: English (`en`); secondary locale: German (`de`)

## 1. Purpose and outcome

Salon is a private, curated B2B marketplace connecting Berlin talent buyers (venues and bookers) with small-format talent. It replaces fragmented discovery, email negotiation, and calendar coordination with a trusted member directory and one auditable booking flow.

The marketplace is **role-segregated**: talent discovers locations and opportunities; buyers discover talent. Peer profiles on the same side of the market are not browseable.

The product succeeds when buyers and talent can discover each other, complete trusted bookings, and platform staff can moderate abusive publication and accounts. Salon is not a consumer event platform, social network, payment custodian, or law firm.

## 2. Personas and glossary

User-facing language uses **Talent**, **Buyer**, and (later) **Agency**. Persistence and code may still use legacy identifiers `entertainer` and `venue` until a deliberate rename migration.

| Term | Meaning | Marketplace side | MVP status |
|---|---|---|---|
| **Talent** | Solo performer or small act seeking paid bookings (profile = act listing) | Supply | Live — free for 1 talent listing |
| **Buyer** | Venue operator or booker who searches talent and sends performance requests (listing = one venue / location) | Demand | Live — free for 1 location |
| **Agency** | Org that manages a multi-talent roster on the supply side | Supply (multi-listing) | Coming soon — shown inactive on signup as a demand probe; no selectable role or backend yet |
| **Location** | A buyer-owned place (exactly one per buyer account). Exactly one **room** for calendar ownership in MVP | Demand listing | Live |
| **Platform staff** | Verifies profiles, suspends accounts, moderates | Ops | Live |

**Monetization direction (not implemented):** free forever for 1 talent listing and 1 buyer location; paid plans later for multi-location buyer orgs and multi-talent agencies. Early-access paid tiers may show €0 to frame future pricing.

**Expansion (out of scope):** additional supply listing kinds (e.g. production vendors: audio, lighting, catering). Prefer shared profile shell + `listing_kind` / discovery filters over new account-type UX.

### Personas (operational)

- **Talent:** act seeking appropriate paid bookings, with clear pricing, availability, production needs, and portfolio evidence.
- **Buyer:** accountable operator who owns exactly one venue profile, publishes open calls, requests acts, and signs agreements.
- **Platform staff:** suspends abusive accounts/publication, handles moderation, and monitors booking operations.

## 3. Roles, account status, and permissions

### 3.1 Account status

| State | Meaning | Marketplace access |
|---|---|---|
| `active` | Self-serve signup complete with one role | Private discovery search, profiles, calendar, and explore (contact gated by own profile publication) |
| `suspended` | Staff removed access | No private marketplace access; existing records retained |

Signup does not require staff account approval. Staff may suspend or reactivate accounts with an audit trail.

### 3.2 Profile publication

Owners **self-publish** talent or location profiles when a built-in QA checklist passes (`publication_state = approved`). Until published:

- The profile is not visible in marketplace discovery.
- The member may still search the opposite side, edit their profile, manage availability, and explore the site.
- The member may not contact marketplace results (submit applications, or send/respond to direct requests).

Published profiles stay published across edits. Owners may **unpublish** (back to `draft`) at any time. Staff may still suspend publication for moderation with an audit trail; staff approval is not required to go live.

### 3.3 Role model

- A person has one account and exactly one selectable marketplace role: talent (**`entertainer`**) **or** buyer (**`venue`**) (XOR). Dual-role accounts are out of scope.
- Agency is not a selectable role in MVP. Signup may show it as **Coming soon** (disabled) to test inbound interest; do not persist an agency role or build roster APIs until specified.
- A buyer account owns **exactly one venue** (`venues.owner_user_id`, unique). Team membership / multi-user venue orgs are out of scope.
- Every authorization decision is server-enforced; hidden UI is not authorization.
- Future agency support should be modeled as a **supply-side org with multiple talent listings** (membership + plan limits), not a third XOR signup role.

## 4. Onboarding and profiles

### 4.1 Shared onboarding

After OAuth sign-in, the member chooses talent or buyer (XOR; stored as `entertainer` / `venue`), accepts terms/privacy, and receives an active account. Collect preferred locale and at least one contact method during profile setup. Email ownership comes from the configured authentication provider. Profile publication is owner self-serve with a built-in checklist (not staff identity verification). Agency may appear on the role picker as a non-selectable coming-soon option.

Buyer onboarding may search Google Places (New) to prefill venue name/address/coords/website; all prefilled fields remain editable. Places is optional — manual entry always works.

### 4.2 Buyer venue profile

One account → one venue → one room (calendar resource). Profile builder matches talent parity (sticky Publish/Unpublish, sectioned autosave form).

Required before self-serve publication:

- Public-to-members venue name and short description
- Structured Berlin address, district, and map coordinates (Places prefill or manual)
- Venue type and audience description
- Capacity (and optional seated/standing context)
- Production resources: PA, mixer, microphones, backline, lighting, stage dimensions, power, accessibility/load-in notes
- Contact via account email (optional phone); stored privately for unlocks
- Native availability calendar (backed by the single room)

Optional: website/social links, house rules, venue images, Google Place id for re-link. A venue profile is discoverable only to **entertainers** (and staff) after publication.

### 4.3 Entertainer profile

Required before self-serve publication (built-in QA):

- Act name and description (character minimums)
- Category and subcategory
- At least one portfolio photo
- At least one public URL (website, social, or featured video)
- Group size and Berlin base / travel radius
- Indicative price minimum and maximum (EUR for MVP)
- At least one private contact method
- Native availability calendar

Optional: performance formats, technical requirements, accessibility notes, languages, equipment supplied, additional links, technical rider uploads. Prices are indicative; agreed booking terms are authoritative. An entertainer profile is discoverable only to **venue operators** (and staff) after publication.

### 4.4 Review behavior

Members save drafts and publish when the checklist passes. Publishing sets `approved` (discoverable). Unpublishing returns to `draft`. Edits while published do not unpublish. Staff can suspend or restore publication with an audit trail. Publication does not represent legal, safety, tax, insurance, or artistic-quality certification.

## 5. Private discovery and contact privacy

- Public visitors see the landing, sign-in, help FAQ (`/help`), contact form (`/contact`), privacy, terms, and cookies surfaces (apply redirects into self-serve signup). Public help stays thin (what Salon is, how access works, contact privacy pointers) and must not publish booking/ops playbooks.
- Active (non-suspended) accounts access private marketplace surfaces for search and explore, plus an in-product help hub (`/marketplace/help`) with member workflow guides. Member-only help articles are not readable while signed out.
- Contact form posts to Spamblock (client pixel + fetch); signed-in users may have name/email prefilled. Formal GDPR requests still follow the privacy page; the form supplements support intake.
- **Role segregation (server-enforced):**
  - Entertainers may search published venues and venue spaces only. They must not browse, search, or open other entertainers’ profiles (except their own). Open calls appear on venue profiles (and as result badges), not as a separate top-level browse.
  - Venues may search published entertainer profiles only. They must not browse, search, or open other venues’ private profiles, except where already a party to a shared booking involving that venue.
  - Staff may access both for moderation.
- Unpublished members can search but cannot initiate contact workflows until their own profile is published.
- Search/filter entertainers by category, group size, price range, location, **date availability** (free = no blocking calendar entry that Berlin local day), and production fit.
- Search/filter venues by location, venue type, audience, capacity, and production resources. Open-call badges may surface on venue cards.
- Member IA is three ops rails plus overview/profile: **Marketplace** (directory), **Bookings** (match pipeline), **Calendar** (time). There is no separate Leads or Opportunities top-level browse.
- Store contact methods separately from discoverable profile data.
- Reveal the selected external contact method only after mutual opt-in: direct-request acceptance, application shortlist, or **Accept / Counter** on a profile-origin offer. Until then contacts stay locked. Sending an offer does **not** unlock contacts; the sender’s engagement documents are visible to the receiver with that open offer (opt-in by sending).
- Log contact-unlock reason, parties, and timestamp.
- Do not build in-platform chat. After unlock, the product clearly hands off to email/phone/other chosen external channel while preserving booking pipeline status in Salon.

## 6. Matching paths

Matching produces a shared **booking** both parties track in one inbox. Internal CRM projection may still say “lead.” Member UI uses **booking** / **negotiation** (never “lead” in user-facing copy). UI copy uses **open call** for venue-published needs (schema table may still be named `opportunities`).

### 6.1 Open calls and applications

An approved venue operator creates open calls on the venue profile:

- **Dated:** required performance window (start/end), format/category, audience, budget, constraints, deadline, notes.
- **Standing:** undated “looking for X” need (format/category required; optional schedule text e.g. “Thursdays”). No calendar holds until a date is agreed later.

Publishing makes the call visible on that venue’s marketplace profile (and as a badge in venue search). There is no top-level Opportunities browse. Entertainers may apply from the venue profile (one-click when possible) or the open-call detail. Venues may reject, shortlist, or request clarification without revealing private contacts. Shortlisting unlocks the chosen contact method and opens the shared booking record.

### 6.2 Direct requests

An approved venue operator sends a request to an approved entertainer for a venue, date/time, proposed fee, format, notes, and optional response deadline. The entertainer declines, accepts, or proposes changes; unanswered requests may expire. Acceptance unlocks the chosen contact method and opens the same booking engine used by shortlisted applications.

### 6.3 Profile offers (connection)

An approved entertainer may **Send offer** to an approved venue from the venue discovery page. An approved venue may likewise **Send offer** from an act profile. The CTA is a commercial offer (dates, fee, format, cancellation, production, optional deposit terms / note), not a “may I contact you” request. Sending creates a pending booking with `booking_terms` v1 and makes the **sender’s** engagement PDFs visible to the receiver with that open offer. Contacts stay locked until the receiver **Accepts** or **Counters**. **Decline** (Pass) closes the booking as lost without unlocking contacts. Accept locks terms (`terms_agreed`). Counter unlocks contacts, opens the booking, and continues the offer/counter timeline. After unlock, both parties’ engagement documents are visible. One active pending/open profile-origin booking is allowed per act↔venue pair. After any send for a pair, a new offer is blocked for **7 days** (inactive CTA + message). After Decline, further profile offers are also blocked for a **30-day** cooldown unless re-opened.

### 6.4 One booking engine

Every booking records its origin (`application`, `direct_request`, or `profile_enquiry`) but uses the same terms, agreement, signature, confirmation, deposit, calendar, audit, and cancellation behavior once enough structure exists. Performance dates may be null until agreed (standing open-call applies); profile-origin offers include a performance window from v1. Calendar conflict checks and holds run only when a start/end window is known.

### 6.5 Bookings inbox (member-facing)

Members track matches in **Bookings** with pipeline statuses projected from booking state:

| Status | Meaning |
|--------|---------|
| Needs you / Pending | One-sided outreach; awaiting Accept / Counter / Decline (or shortlist for applications) |
| In progress / Open | Connection established; contacts unlocked; negotiate offers until Accept |
| Confirmed / Won | Booking confirmed (agreement signed) |
| Lost | Passed, declined, rejected, withdrawn, expired, or cancelled before confirm |
| Done / Completed | Confirmed, and the performance window has ended |

Contact unlock fires once on mutual opt-in (application shortlist, direct-request accept, or profile-offer Accept/Counter). The former separate “Leads” inbox and the old bookings-only list are one surface.

## 7. Booking lifecycle

Canonical lifecycle:

1. `requested` or `applied` (booking inbox: Pending) — profile-origin includes an open commercial offer
2. `shortlisted` (application shortlist or profile-offer Counter) or `accepted` (direct request accept or profile-offer Counter) (Open); profile-offer **Accept** may move Pending → `terms_agreed` in one step after unlock
3. `terms_agreed`
4. `agreement_generated`
5. `partially_signed`
6. `confirmed` when both required parties have signed (Confirmed / Won)

Terminal/exception states: `declined`, `rejected`, `withdrawn`, `expired`, `cancelled` (Lost). After Confirmed, when the performance end time has passed, the inbox projects as Done / Completed.

State changes must be validated, idempotent, authorized, and audited.

Agreed terms snapshot venue, act, service date/times/time zone (when known), fee/currency, performance format, cancellation terms, production obligations, and optional deposit terms. Later profile edits do not alter this snapshot. Undated open bookings may add or edit date/fee/format progressively before terms agreement.

### 7.1 Negotiation page (contract builder)

The booking detail surface is a **shared negotiation / contract builder**:

- Both parties see act and venue imagery and names once the booking is Open.
- **Offers / counters:** Either party may send a versioned commercial offer (dates, fee, format, cancellation, production, deposit terms, optional change note). At most one open offer exists at a time. The counterparty **Accepts** (→ `terms_agreed`), **Counters** (supersedes the open offer and sends the next version), or **Declines** while Pending. The proposer waits until the other party responds; there is no second “agree” from the proposer. Draft fields stay local until **Send offer** / **Send counter** (not autosaved into new versions). Profile-origin connection starts with Send offer (v1 on the pending booking); Accept or Counter establishes the connection (contacts + mutual engagement docs). After Open, negotiation continues on this timeline until Accept → agreement generation.
- **Documents package:** marketplace/engagement profile PDFs from both act and venue, plus booking-scoped uploads by either party (uploader may delete their own booking upload). While a profile-origin offer is open and Pending, only the **sender’s** engagement PDFs are visible to the receiver. After Accept/Counter unlock, both sides’ engagement docs are visible. Before generate, each file receives a stable **Addendum N** order (act profile → venue profile → booking uploads by upload time). Profile docs are managed on Profile; booking uploads are for night-specific PDFs.
- **Agreement package** = generated agreement (DE controlling + EN convenience) **plus** the numbered addenda snapshot. Addendum file IDs/titles are frozen on the agreement row so later profile edits do not change the signed package.
- Section order: Overview → Offers → Documents package → Agreement. Cancel is a danger-zone control. Deposit **terms** live inside each offer; deposit **status** recording is outside this negotiation surface (post-contract).

## 8. Agreement, signatures, deposits, and invoices

- Generated agreements have German controlling text and an English convenience translation linked to the same versioned terms.
- The product defines an e-signature provider boundary and test/sandbox status. It does not deliver production legal documents or live e-signatures until provisioned and counsel-approved.
- Legal text requires qualified German counsel before production use.
- Both designated signers must sign the same agreement version for `confirmed`.
- Signature-provider webhooks must be authenticated, idempotent, and reconciled with local state.
- Deposit status is separate: `not_required`, `pending`, `received`, `refunded`, or `disputed`.
- A deposit never confirms a booking and lack of a deposit never prevents signature-based confirmation.
- Salon does not collect, hold, escrow, route, or refund money in the current product.
- **Legal / payment identity** lives on the member account (individual / freelancer / registered business). Fields support agreement parties and optional invoice artifacts (see `docs/INVOICE_LIBRARY_SPIKE.md`). Counterparty legal/payment details are revealed only at/after `terms_agreed` (not at contact unlock). Identity is snapshotted onto the agreement at generate time.
- **Invoices** are optional post-`confirmed` PDF/e-invoice **artifacts** for the parties (talent seller → venue buyer by default). Generation uses an `InvoiceProvider` boundary (sandbox first). Invoices are not checkout, escrow, or payouts.

## 9. Availability and calendar

Native states are `available`, `unavailable`, `tentative_hold`, `requested`, and `confirmed`.

- Availability belongs to an entertainer act or venue space and has start/end in UTC plus the `Europe/Berlin` display zone.
- Tentative holds have an expiry timestamp and automatically cease to block after expiry.
- Requests create requested calendar blocks for both relevant sides.
- Confirmed bookings create blocking confirmed entries for the venue space and entertainer act in the same transaction as confirmation.
- The system prevents overlapping confirmed bookings and detects conflicts before accepting/shortlisting, agreeing terms, and confirming.
- Staff can inspect and repair inconsistencies with an audit reason.
- Manual availability/unavailable/hold entries may be created as recurring schedules using `RRule` (daily/weekly/monthly), with explicit exceptions for single-occurrence overrides. Recurring confirmed bookings are out of scope for this calendar feature.
- The native calendar UX is implemented with FullCalendar React v7 (dayGrid/timeGrid/list + selection/drag/resize for manual entries).
- External calendar synchronization is delivered in phases. A first phase can add secure server-side iCalendar/ICS import (busy overlays only) and revocable ICS export for confirmed bookings. Google/Microsoft OAuth provider sync is a later phase. Native calendar must work without it, and sync must not block validating core booking flows.

## 10. Internationalization

- English is the default interface and fallback locale; German is available throughout public, onboarding, marketplace, transactional, validation, and email copy.
- Locale-prefixed routes are preferred (`/en/...`, `/de/...`), with user preference persisted.
- User-entered profile content is not automatically translated.
- Dates, times, numbers, currency, and pluralization use locale-aware formatting.
- Agreement German is controlling; English is explicitly labeled a convenience translation.
- Missing translation keys fail CI for required catalogs.
- Public and private pages define localized metadata; private pages are `noindex, nofollow`.

## 11. Admin operations

Staff require a protected admin surface to:

- Review profile publication and change publication states with reasons
- Inspect venue memberships and restore access safely
- View and moderate profiles, opportunities, applications, requests, bookings, calendar conflicts, contact unlocks, and upload metadata
- Suspend/reactivate accounts without deleting history
- Retry/reconcile agreement-provider events
- Record manual deposit-status corrections without processing money
- View immutable audit events and operational metrics

Destructive hard deletion is not a routine admin action. Data-subject deletion requests require a separate retention/legal procedure.

## 12. Out of scope (current product)

No consumer event pages, public profile directory, public listings, public reviews/ratings, in-platform chat, escrow, payment custody, checkout, automatic payouts/refunds, live legal advice, live e-signatures (until provisioned), complex automatic verification, dual-role accounts, recommendation ML, ticketing, tax/insurance verification, or tax-authority e-invoice filing/PEPPOL network submission. Invoice **PDF/e-invoice artifacts** for parties are in scope (see §8); money movement is not. External calendar sync is deferred to its own milestone, not claimed as operational until implemented.

## 13. Acceptance criteria

- Anonymous and suspended users cannot access private profiles, opportunities, contact data, or booking records.
- Self-serve signup creates an active account with exactly one role (entertainer XOR venue) without staff account approval.
- Staff can suspend/reactivate accounts and suspend/restore profile publication with an audit trail.
- Unpublished members can search the opposite side but cannot contact (apply / direct request) until their profile is published; unpublished profiles are invisible in discovery.
- An owner can invite/manage venue members.
- Venue and entertainer profiles capture required fields and support self-serve publish/unpublish with a built-in checklist.
- Entertainers cannot browse other entertainers; venues cannot browse other venues (server-enforced).
- A published entertainer can apply once to an open call (including one-click from the venue profile); a venue can shortlist or reject.
- A published entertainer or venue can Send offer on the opposite profile; the receiver Accepts, Counters, or Declines.
- A published venue can send a direct request; an entertainer can accept or decline.
- All origins converge on one enforced booking state machine projected as a lead pipeline.
- Contact unlock occurs only at mutual opt-in (shortlist / direct-request accept / profile-offer Accept or Counter) and is audited.
- Undated open leads do not create calendar holds until a performance window exists.
- Both signatures on the current agreement version confirm the booking and atomically block both calendars.
- Deposit status can change independently without confirming a booking.
- Expired holds stop blocking; overlapping confirmations are rejected under concurrent requests.
- English and German cover all critical flows, with the agreement-language hierarchy visible.
- No excluded or deferred feature is represented as operational.

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Cold-start marketplace liquidity | Curated Berlin pilot, staff invitations, narrow categories/districts |
| Circumvention after contact unlock | Provide value through agreement/calendar workflow; monitor drop-off, do not over-surveil |
| Unsafe contact exposure | Server authorization, encrypted transport, audit unlocks, least-privilege admin access |
| Peer-directory leakage | Role-scoped discovery permissions and queries; IDOR tests |
| Double booking/race conditions | Database constraints, transactions/locking, idempotency keys, conflict tests |
| Legal-language ambiguity | German controlling clause, explicit English label, counsel approval, versioned templates |
| Approval burden/bias | Review checklist, reasons, audit sampling, SLA and fairness monitoring |
| Stale availability | Reminders, hold expiry, last-updated visibility, easy calendar editing |
| File abuse/malware | Private storage, allowlists/limits, randomized keys, scanning boundary, signed access |

## 15. Pilot metrics

Measure weekly by role and without exposing member-sensitive data:

- Applications/invitations → approved conversion and median review time
- Approved profiles reaching completeness threshold
- Weekly active approved venues and entertainers
- Published opportunities, qualified applications per opportunity, and direct requests
- Shortlist/accept rate, contact unlock rate, and terms-agreed rate
- Median time from opportunity/request to confirmation
- Confirmed bookings and cancellation rate
- Calendar conflict attempts prevented and expired holds
- Agreement generation/signature completion rate and webhook failures
- Repeat booking rate within 90 days
- Support/moderation incidents and privacy complaints

Pilot targets are set after baseline observation; avoid vanity targets before enough Berlin activity exists.
