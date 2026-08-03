# Salon MVP Product Specification

Status: implementation source of truth  
Market: Berlin, Germany  
Default locale: English (`en`); secondary locale: German (`de`)

## 1. Purpose and outcome

Salon is a private, curated B2B marketplace connecting Berlin venues with small-format entertainers. It replaces fragmented discovery, email negotiation, and calendar coordination with a trusted member directory and one auditable booking flow.

The MVP succeeds when approved venues can find and confirm suitable acts, approved entertainers can find and win relevant opportunities, and platform staff can maintain marketplace trust through manual approval. Salon is not a consumer event platform, social network, payment custodian, or law firm.

## 2. Personas

- **Entertainer:** solo performer or small act seeking appropriate paid bookings, with clear pricing, availability, production needs, and portfolio evidence.
- **Venue owner:** accountable operator who creates a venue organization, manages members, publishes opportunities, requests acts, and signs agreements.
- **Venue member:** staff member authorized by an owner to operate a venue within assigned permissions.
- **Dual-role member:** one person who operates a venue and performs; one account holds both roles without duplicate identities.
- **Platform staff:** reviews applications and profiles, changes approval states, handles moderation, and monitors booking operations.

## 3. Roles, approval, and permissions

### 3.1 Account approval states

| State | Meaning | Marketplace access |
|---|---|---|
| `applied` | Self-service application submitted | Own application/profile only |
| `invited` | Staff issued an invitation | Invitation acceptance and onboarding only |
| `approved` | Staff approved the account | Private discovery and permitted workflows |
| `suspended` | Staff removed access | No private marketplace access; existing records retained |

Only platform staff change approval state. Re-approval rules for material profile edits are an operational policy, not automatic identity verification.

### 3.2 Role model

- A person has one account and may enable entertainer, venue, or both capabilities.
- A venue is an organization, not a person.
- Venue membership is many-to-many and has `owner` or `member` role.
- Owners manage organization profile, membership, opportunities, requests, bookings, and signatures.
- Members may manage venue workflows granted by the MVP permission set, but cannot remove the last owner or change platform approval.
- Every authorization decision is server-enforced; hidden UI is not authorization.

## 4. Onboarding and profiles

### 4.1 Shared onboarding

Collect name, email, preferred locale, chosen marketplace roles, Berlin connection, terms/privacy acknowledgement, and at least one contact method. Show current review state and staff-facing audit history. Email ownership comes from the configured authentication provider; other claims are manually reviewed, not automatically verified.

### 4.2 Venue organization profile

Required before approval:

- Public-to-members venue name and short description
- Structured Berlin address, district, and map coordinates
- Venue type and audience description
- Capacity, including seated/standing context where relevant
- Production resources: PA, mixer, microphones, backline, lighting, stage dimensions, power, accessibility/load-in notes
- At least one contact method, stored privately
- Native availability calendar
- Owner membership

Optional: website/social links, house rules, portfolio media, multiple spaces with distinct capacity/resources. A profile is discoverable only to approved users after staff approval.

### 4.3 Entertainer profile

Required before approval:

- Act name, category/genre, and description
- Group size and Berlin base/travel radius
- Indicative price minimum/maximum and currency (EUR for MVP)
- Performance duration/set structure
- Technical requirements summary
- At least one private contact method
- Native availability calendar

Optional: accessibility notes, portfolio links/media, stage plot or technical rider upload, languages, own equipment, and travel terms. Prices are indicative; agreed booking terms are authoritative.

### 4.4 Review behavior

Members save drafts and submit profiles for review. Staff can approve, request changes, or suspend. The system records actor, timestamp, previous/new state, and reason. Approval does not represent legal, safety, tax, insurance, or artistic-quality certification.

## 5. Private discovery and contact privacy

- Public visitors see only the landing, access application, sign-in, privacy, and terms surfaces.
- Only approved accounts can browse profiles and open opportunities.
- Search/filter entertainers by category, group size, price range, location, date availability, and production fit.
- Search/filter venues/opportunities by location, date, budget, venue type, audience, capacity, and production resources.
- Store contact methods separately from discoverable profile data.
- Reveal the selected external contact method only after a direct request is accepted or an application is shortlisted.
- Log contact-unlock reason, parties, and timestamp.
- Do not build in-platform chat. After unlock, the product clearly hands off to email/phone/other chosen external channel while preserving booking status in Salon.

## 6. Matching paths

### 6.1 Open opportunities and applications

An approved venue operator creates a draft opportunity with venue/space, date and times, format/category, expected audience, budget or range, act-size constraints, production context, application deadline, and notes. Publishing makes it visible to approved entertainers. Entertainers submit one application per act/opportunity with message, quoted range, availability confirmation, and relevant portfolio references. Venues may reject or shortlist applications. Shortlisting unlocks the chosen contact method and creates/advances the shared booking record.

### 6.2 Direct requests

An approved venue operator sends a request to an approved entertainer for a venue, date/time, proposed fee, format, and notes. The entertainer declines or accepts. Acceptance unlocks the chosen contact method and advances the same booking engine used by shortlisted applications.

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
- The MVP defines an e-signature provider boundary and test/sandbox status only. It does not deliver production legal documents or live e-signatures.
- Legal text requires qualified German counsel before production use.
- Both designated signers must sign the same agreement version for `confirmed`.
- Signature-provider webhooks must be authenticated, idempotent, and reconciled with local state.
- Deposit status is separate: `not_required`, `pending`, `received`, `refunded`, or `disputed`.
- A deposit never confirms a booking and lack of a deposit never prevents signature-based confirmation.
- Salon does not collect, hold, escrow, route, or refund money in the MVP.

## 9. Availability and calendar

Native states are `available`, `unavailable`, `tentative_hold`, `requested`, and `confirmed`.

- Availability belongs to an entertainer act or venue space and has start/end in UTC plus the `Europe/Berlin` display zone.
- Tentative holds have an expiry timestamp and automatically cease to block after expiry.
- Requests create requested calendar blocks for both relevant sides.
- Confirmed bookings create blocking confirmed entries for the venue space and entertainer act in the same transaction as confirmation.
- The system prevents overlapping confirmed bookings and detects conflicts before accepting/shortlisting, agreeing terms, and confirming.
- Staff can inspect and repair inconsistencies with an audit reason.
- No Google/Apple/Outlook calendar sync in MVP.

## 10. Internationalization

- English is the default interface and fallback locale; German is available throughout public, onboarding, marketplace, transactional, validation, and email copy.
- Locale-prefixed routes are preferred (`/en/...`, `/de/...`), with user preference persisted.
- User-entered profile content is not automatically translated.
- Dates, times, numbers, currency, and pluralization use locale-aware formatting.
- Agreement German is controlling; English is explicitly labeled a convenience translation.
- Missing translation keys fail CI for required catalogs.

## 11. Admin operations

Staff require a protected admin surface to:

- Review account/profile applications and change approval states with reasons
- Inspect venue memberships and restore access safely
- View and moderate profiles, opportunities, applications, requests, bookings, calendar conflicts, contact unlocks, and upload metadata
- Suspend/reactivate accounts without deleting history
- Retry/reconcile agreement-provider events
- Record manual deposit-status corrections without processing money
- View immutable audit events and operational metrics

Destructive hard deletion is not a routine admin action. Data-subject deletion requests require a separate retention/legal procedure.

## 12. MVP exclusions

No consumer event pages, public profile directory, public listings, public reviews/ratings, in-platform chat, escrow, payment custody, checkout, automatic payouts/refunds, live legal advice, live e-signatures, external calendar sync, complex automatic verification, recommendation ML, ticketing, or tax/insurance verification.

## 13. Acceptance criteria

- Anonymous and unapproved users cannot access private profiles, opportunities, contact data, or booking records.
- Staff can move an account through all four approval states with an audit trail.
- A person can operate both role types and an owner can invite/manage venue members.
- Venue and entertainer profiles capture all required fields and support review submission.
- An approved entertainer can apply once to an open opportunity; a venue can shortlist or reject.
- An approved venue can send a direct request; an entertainer can accept or decline.
- Both origins converge on one enforced booking state machine.
- Contact unlock occurs only at shortlist/acceptance and is audited.
- Both signatures on the current agreement version confirm the booking and atomically block both calendars.
- Deposit status can change independently without confirming a booking.
- Expired holds stop blocking; overlapping confirmations are rejected under concurrent requests.
- English and German cover all critical flows, with the agreement-language hierarchy visible.
- No excluded feature is represented as operational.

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Cold-start marketplace liquidity | Curated Berlin pilot, staff invitations, narrow categories/districts |
| Circumvention after contact unlock | Provide value through agreement/calendar workflow; monitor drop-off, do not over-surveil |
| Unsafe contact exposure | Server authorization, encrypted transport, audit unlocks, least-privilege admin access |
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
