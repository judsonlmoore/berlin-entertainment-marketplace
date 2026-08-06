# Salon MVP Product Specification

Status: implementation source of truth  
Companion direction: [MARKETPLACE_REQUIREMENTS.md](./MARKETPLACE_REQUIREMENTS.md)  
Market: Berlin, Germany  
Default locale: English (`en`); secondary locale: German (`de`)

## 1. Purpose and outcome

Salon is a private, curated B2B marketplace connecting Berlin talent buyers (venues and bookers) with small-format talent. It replaces fragmented discovery, email negotiation, and calendar coordination with a trusted member directory and one auditable booking flow.

The marketplace is **role-segregated**: talent discovers locations and opportunities; buyers discover talent. Peer profiles on the same side of the market are not browseable.

The product succeeds when buyers and talent can discover each other, complete trusted bookings, and platform staff can verify profiles for marketplace visibility and contact eligibility. Salon is not a consumer event platform, social network, payment custodian, or law firm.

## 2. Personas and glossary

User-facing language uses **Talent**, **Buyer**, and (later) **Agency**. Persistence and code may still use legacy identifiers `entertainer` and `venue` until a deliberate rename migration.

| Term | Meaning | Marketplace side | MVP status |
|---|---|---|---|
| **Talent** | Solo performer or small act seeking paid bookings (profile = act listing) | Supply | Live — free for 1 talent listing |
| **Buyer** | Venue operator or booker who searches talent and sends performance requests (listing = location / venue org) | Demand | Live — free for 1 location |
| **Agency** | Org that manages a multi-talent roster on the supply side | Supply (multi-listing) | Coming soon — shown inactive on signup as a demand probe; no selectable role or backend yet |
| **Location** | A buyer-owned place (venue org). Distinct from **spaces** (rooms inside one location) | Demand listing | Live |
| **Platform staff** | Verifies profiles, suspends accounts, moderates | Ops | Live |

**Monetization direction (not implemented):** free forever for 1 talent listing and 1 buyer location; paid plans later for multi-location buyer orgs and multi-talent agencies. Early-access paid tiers may show €0 to frame future pricing.

**Expansion (out of scope):** additional supply listing kinds (e.g. production vendors: audio, lighting, catering). Prefer shared profile shell + `listing_kind` / discovery filters over new account-type UX.

### Personas (operational)

- **Talent:** act seeking appropriate paid bookings, with clear pricing, availability, production needs, and portfolio evidence.
- **Buyer owner:** accountable operator who creates a location organization, manages members, publishes opportunities, requests acts, and signs agreements.
- **Buyer member:** staff member authorized by an owner to operate a location within assigned permissions.
- **Platform staff:** verifies profiles for discovery/contact eligibility, suspends abusive accounts, handles moderation, and monitors booking operations.

## 3. Roles, account status, and permissions

### 3.1 Account status

| State | Meaning | Marketplace access |
|---|---|---|
| `active` | Self-serve signup complete with one role | Private discovery search, profiles, calendar, and explore (contact gated by profile verification) |
| `suspended` | Staff removed access | No private marketplace access; existing records retained |

Signup does not require staff account approval. Staff may suspend or reactivate accounts with an audit trail.

### 3.2 Profile verification (publication)

Staff approve talent or location **profile publication** independently of account status. Until a member’s relevant profile is verified (`publication_state = approved`):

- The profile is not visible in marketplace discovery.
- The member may still search the opposite side, edit their profile, manage availability, and explore the site.
- The member may not contact marketplace results (submit applications, or send/respond to direct requests).

Surface copy should set expectation that verification is usually complete within **3 business days**, and encourage completing the profile, updating availability, and exploring meanwhile.

### 3.3 Role model

- A person has one account and exactly one selectable marketplace role: talent (**`entertainer`**) **or** buyer (**`venue`**) (XOR). Dual-role accounts are out of scope.
- Agency is not a selectable role in MVP. Signup may show it as **Coming soon** (disabled) to test inbound interest; do not persist an agency role or build roster APIs until specified.
- A buyer location is an organization, not a person.
- Location membership is many-to-many and has `owner` or `member` role.
- Owners manage organization profile, membership, opportunities, requests, bookings, and signatures.
- Members may manage buyer workflows granted by the permission set, but cannot remove the last owner or change platform account status.
- Every authorization decision is server-enforced; hidden UI is not authorization.
- Future agency support should be modeled as a **supply-side org with multiple talent listings** (membership + plan limits), not a third XOR signup role.

## 4. Onboarding and profiles

### 4.1 Shared onboarding

After OAuth sign-in, the member chooses talent or buyer (XOR; stored as `entertainer` / `venue`), accepts terms/privacy, and receives an active account. Collect preferred locale and at least one contact method during profile setup. Email ownership comes from the configured authentication provider; profile claims are staff-verified for publication, not automatic identity verification. Agency may appear on the role picker as a non-selectable coming-soon option.

### 4.2 Venue organization profile

Required before staff publication verification:

- Public-to-members venue name and short description
- Structured Berlin address, district, and map coordinates
- Venue type and audience description
- Capacity, including seated/standing context where relevant
- Production resources: PA, mixer, microphones, backline, lighting, stage dimensions, power, accessibility/load-in notes
- At least one contact method, stored privately
- Native availability calendar
- Owner membership

Optional: website/social links, house rules, venue images, multiple spaces with distinct capacity/resources. A venue profile is discoverable only to **entertainers** (and staff) after staff publication approval.

### 4.3 Entertainer profile

Required before staff publication verification:

- Act name, category/genre, and description
- Group size and Berlin base/travel radius
- Indicative price minimum/maximum and currency (EUR for MVP)
- Performance duration/set structure
- Technical requirements summary
- At least one private contact method
- Native availability calendar

Optional: accessibility notes, languages, equipment supplied, website/social/YouTube links, portfolio media, technical rider uploads. Prices are indicative; agreed booking terms are authoritative. An entertainer profile is discoverable only to **venue operators** (and staff) after staff publication approval.

### 4.4 Review behavior

Members save drafts and submit profiles for verification. Staff can approve, request changes, or suspend publication. The system records actor, timestamp, previous/new state, and reason. Verification does not represent legal, safety, tax, insurance, or artistic-quality certification.

## 5. Private discovery and contact privacy

- Public visitors see only the landing, sign-in, privacy, and terms surfaces (apply redirects into self-serve signup).
- Active (non-suspended) accounts access private marketplace surfaces for search and explore.
- **Role segregation (server-enforced):**
  - Entertainers may search verified venues, venue spaces, and open opportunities only. They must not browse, search, or open other entertainers’ profiles (except their own).
  - Venues may search verified entertainer profiles only. They must not browse, search, or open other venues’ private profiles, except where already a party to a shared booking involving that venue.
  - Staff may access both for moderation.
- Unverified members can search but cannot initiate contact workflows until their own profile is verified.
- Search/filter entertainers by category, group size, price range, location, date availability, and production fit.
- Search/filter venues/opportunities by location, date, budget, venue type, audience, capacity, and production resources.
- Store contact methods separately from discoverable profile data.
- Reveal the selected external contact method only after a direct request is accepted or an application is shortlisted.
- Log contact-unlock reason, parties, and timestamp.
- Do not build in-platform chat. After unlock, the product clearly hands off to email/phone/other chosen external channel while preserving booking status in Salon.

## 6. Matching paths

### 6.1 Open opportunities and applications

An approved venue operator creates a draft opportunity with venue/space, date and times, format/category, expected audience, budget or range, act-size constraints, production context, application deadline, and notes. Publishing makes it visible to approved entertainers. Entertainers may save application drafts and submit one application per act/opportunity with message, quoted range, availability confirmation, and relevant portfolio references. Venues may reject, shortlist, or request clarification without revealing private contacts. Shortlisting unlocks the chosen contact method and creates/advances the shared booking record.

### 6.2 Direct requests

An approved venue operator sends a request to an approved entertainer for a venue, date/time, proposed fee, format, notes, and optional response deadline. The entertainer declines, accepts, or proposes changes; unanswered requests may expire. Acceptance unlocks the chosen contact method and advances the same booking engine used by shortlisted applications.

### 6.3 One booking engine

Every booking records its origin (`application` or `direct_request`) but uses the same terms, agreement, signature, confirmation, deposit, calendar, audit, and cancellation behavior.

## 7. Booking lifecycle

Canonical lifecycle:

1. `requested` or `applied`
2. `shortlisted` (application) or `accepted` (direct request)
3. `terms_agreed`
4. `agreement_generated`
5. `partially_signed`
6. `confirmed` when both required parties have signed

Terminal/exception states: `declined`, `rejected`, `withdrawn`, `expired`, `cancelled`. State changes must be validated, idempotent, authorized, and audited.

Agreed terms snapshot venue, act, service date/times/time zone, fee/currency, performance format, cancellation terms, production obligations, and optional deposit terms. Later profile edits do not alter this snapshot.

## 8. Agreement, signatures, and deposits

- Generated agreements have German controlling text and an English convenience translation linked to the same versioned terms.
- The product defines an e-signature provider boundary and test/sandbox status. It does not deliver production legal documents or live e-signatures until provisioned and counsel-approved.
- Legal text requires qualified German counsel before production use.
- Both designated signers must sign the same agreement version for `confirmed`.
- Signature-provider webhooks must be authenticated, idempotent, and reconciled with local state.
- Deposit status is separate: `not_required`, `pending`, `received`, `refunded`, or `disputed`.
- A deposit never confirms a booking and lack of a deposit never prevents signature-based confirmation.
- Salon does not collect, hold, escrow, route, or refund money in the current product.

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

No consumer event pages, public profile directory, public listings, public reviews/ratings, in-platform chat, escrow, payment custody, checkout, automatic payouts/refunds, live legal advice, live e-signatures (until provisioned), complex automatic verification, dual-role accounts, recommendation ML, ticketing, or tax/insurance verification. External calendar sync is deferred to its own milestone, not claimed as operational until implemented.

## 13. Acceptance criteria

- Anonymous and suspended users cannot access private profiles, opportunities, contact data, or booking records.
- Self-serve signup creates an active account with exactly one role (entertainer XOR venue) without staff account approval.
- Staff can suspend/reactivate accounts and verify profile publication with an audit trail.
- Unverified members can search the opposite side but cannot contact (apply / direct request) until their profile is verified; unverified profiles are invisible in discovery.
- An owner can invite/manage venue members.
- Venue and entertainer profiles capture required fields and support verification submission.
- Entertainers cannot browse other entertainers; venues cannot browse other venues (server-enforced).
- A verified entertainer can apply once to an open opportunity; a venue can shortlist or reject.
- A verified venue can send a direct request; an entertainer can accept or decline.
- Both origins converge on one enforced booking state machine.
- Contact unlock occurs only at shortlist/acceptance and is audited.
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
