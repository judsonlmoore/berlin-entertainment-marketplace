# Salon MVP Technical Specification

Status: implementation source of truth  
Companion: [Product specification](./PRODUCT_SPEC.md)

## 1. Architecture decisions

- **Application:** Next.js App Router, TypeScript strict mode, React Server Components by default, deployed to Vercel.
- **Database:** Neon Postgres provisioned through the Vercel Marketplace. Do not use the sunset legacy `@vercel/postgres` product/package.
- **ORM:** Drizzle ORM with committed, reviewed SQL migrations and deterministic seed tooling.
- **Authentication:** Auth.js / NextAuth using the Drizzle database adapter against the same Neon database. OAuth/email providers are provisioned separately; no provider is assumed live.
- **Files:** Vercel Blob with private access for future technical riders and restricted media. MVP may expose the abstraction and metadata model before enabling uploads.
- **Internationalization:** locale-prefixed App Router segments with English default/fallback and German catalogs.
- **Runtime:** Node.js for database, authentication, uploads, and webhook routes. Do not opt into Edge unless a route is proven compatible.

The current prototype is reference material, not the production architecture. Provision integrations before replacing it. Never claim Vercel, Neon, Blob, OAuth, email, or e-signature connectivity until credentials exist and a smoke test passes.

## 2. Suggested project shape

```text
app/
  [locale]/(public)/
  [locale]/(auth)/sign-in/
  [locale]/(marketplace)/marketplace/
  [locale]/(admin)/admin/
  api/session/[...nextauth]/route.ts
  api/auth/[...nextauth]/route.ts
  api/webhooks/esign/route.ts
  api/uploads/rider/route.ts
src/
  auth.ts
  db/{client,schema,queries}/
  domain/{approval,booking,calendar,permissions}/
  actions/
  integrations/{esign,files}/
  i18n/
  validation/
drizzle/
scripts/seed.ts
```

Route groups describe access boundaries; server authorization still runs in every page, action, query, handler, and webhook that reads or mutates protected data.

## 3. Data model

Use UUID primary keys, `timestamptz`, explicit foreign keys, check constraints/enums, normalized emails where appropriate, and `created_at`/`updated_at`. Prefer soft lifecycle states over deletion. Suggested tables:

### Identity and authorization

- `users`: Auth.js-compatible identity plus locale and platform staff flag
- `accounts`, `sessions`, `verification_tokens`, `authenticators`: Auth.js adapter tables
- `marketplace_accounts`: user ID, account status (`active`/`suspended`), terms acceptance, reviewed by/at/reason for suspend
- `account_legal_identities`: one row per user — entity type (`individual`/`freelancer`/`registered_business`), legal/trading name, address, country, tax ID, company register ID, invoice email, optional IBAN/BIC/payment note (payee instructions only; never card numbers)
- `user_roles`: user ID + exactly one of `entertainer`/`venue` (unique per user)
- `contact_methods`: owner type/ID, kind, encrypted-or-protected value, preferred flag
- `audit_events`: actor, action, subject, structured metadata, request correlation, timestamp

### Venue and entertainer

- `venues`: buyer-owned profile (`owner_user_id` unique — 1 account → 1 venue), address/location, optional `google_place_id`, type, audience, capacity, publication state
- `venue_spaces`: exactly one room per venue for calendar ownership (MVP); capacity/stage fields synced from the buyer profile
- `entertainer_profiles`: act identity, category, description, group size, price range, duration, travel/production data
- `portfolio_items`: metadata and restricted/public-to-members Blob key, not a public URL
- `rider_files` / profile documents: Blob key, owner (entertainer XOR venue), optional `booking_id` for booking-scoped uploads, MIME type, size, checksum, scan status, uploader, visibility

### Matching and booking

- `opportunities`: venue/space, **kind** `dated` | `standing`, window (required for dated; null for standing), optional standing schedule text, budget, constraints, deadline, draft/open/closed/cancelled state (member UI: **open call**)
- `applications`: opportunity + entertainer, message/quote, lifecycle; unique pair
- `direct_requests`: venue + entertainer, proposed terms, lifecycle
- `profile_enquiries`: act↔venue profile-origin connection; pending/interested/passed/withdrawn; first step creates pending booking + `booking_terms` offer v1; one active pending/interested pair per act↔venue (partial unique index); 7-day re-send cooldown after any send; 30-day pass/decline cooldown before re-submit
- `bookings`: origin type/ID (`application` | `direct_request` | `profile_enquiry`), parties, lifecycle, version, cancelled metadata — member UI is the **Bookings** inbox (Pending/Open/Confirmed/Lost/Done)
- `booking_terms`: immutable versioned offer snapshots (cents); at most one open offer (`accepted_at` and `superseded_at` both null); counters supersede prior open rows; optional `change_note`
- `contact_unlocks`: booking/application/request/profile_enquiry, parties, reason, timestamp; unlock on mutual opt-in (shortlist / direct-request accept / profile-offer Accept or Counter). Standing open-call applies skip calendar holds until a performance window exists; profile offers include dates from v1.
- `agreement_templates`: locale, version, legal review status
- `agreements`: booking terms version, German/English rendered artifact references, provider/status, **addenda snapshot** (ordered document IDs/titles frozen at generate)
- `signatures`: agreement, signer user/party, provider reference, status/timestamps
- `deposit_status_events`: append-only status and optional reference/note; never payment credentials
- `booking_invoices`: booking ID, format, Blob key, seller/buyer identity snapshot, validation status; optional post-confirm artifact via `InvoiceProvider`

### Calendar

- `calendar_entries`: owner type/ID, start/end UTC, display timezone, state, hold expiry, booking/source reference, version, optional title/private note/all-day, optional `recurrence_rule` for **manual** series only
- `calendar_recurrence_exceptions`: skipped/overridden occurrence starts for a recurring parent
- `external_calendar_subscriptions` / `cached_external_events`: server-side ICS feed import (busy overlays; no titles)
- `calendar_export_tokens`: revocable secret hashes for confirmed-booking ICS export URLs
- `calendar_connections`: OAuth provider connection stubs (disconnected by default; Phase 10b)
- Use Postgres range types or equivalent exclusion constraints to prevent overlapping `confirmed` entries for the same bookable resource.
- Index approval/discovery filters, open opportunity dates, booking party/state, active calendar ranges, and audit subject/time based on real query plans.

## 4. Database access and migrations

- Use `@neondatabase/serverless` with Drizzle's Neon HTTP/WebSocket driver for standard serverless queries; initialize lazily so builds do not require `DATABASE_URL`.
- Keep all database access server-only. Export narrow query/service functions, not a client to UI code.
- Commit generated SQL under `drizzle/`; never edit a migration already applied to shared environments.
- Migration workflow: change schema → generate SQL → inspect constraints/destructive changes → test against disposable/local branch → migrate → seed → run verification.
- `drizzle-kit` scripts pass `--config=drizzle.config.ts`. Kit prefers `DATABASE_URL_UNPOOLED` (then `DATABASE_URL`) and the `pg` driver so migrate/studio use TCP instead of Neon websockets. App runtime stays on `@neondatabase/serverless`.
- Seed only synthetic Berlin demo data. Make seeding idempotent and require an explicit non-production guard.
- Use database transactions for booking transitions, signatures-to-confirmation, contact unlock, and calendar blocking.

## 5. Authentication and authorization

- Configure Auth.js in `src/auth.ts` with `@auth/drizzle-adapter` and the shared Drizzle client.
- Persist sessions in the database. Use secure, HTTP-only, same-site cookies and trusted host/origin configuration.
- Provider credentials remain environment configuration. A development-only demo bypass, if retained, must be explicit, impossible in production, visibly labeled, and never share production data.
- Central permission functions evaluate authenticated user, account status, profile publication verification for contact, platform staff role, requested capability, and venue ownership (`venues.owner_user_id`).
- Suspended users lose private reads/writes immediately; preserve bookings/audit history for staff handling.
- Protect at data access and mutation boundaries. A route proxy may redirect early but is not sufficient authorization.
- Prevent open redirects and account-linking ambiguity; normalize and verify provider email behavior.

## 6. Routes and mutations

Representative pages:

- Public: `/[locale]`, `/[locale]/apply`, `/[locale]/privacy`, `/[locale]/terms`
- Auth: `/[locale]/sign-in`, `/api/session/[...nextauth]` (Auth.js `basePath`; legacy `/api/auth/*` redirects to sign-in)
- Onboarding: `/[locale]/onboarding`, `/[locale]/onboarding/status`
- Marketplace: `/[locale]/marketplace` (overview), role-segregated discovery (`/entertainers`, `/venues`), `/bookings` (unified inbox), `/bookings/[id]` (**negotiation / contract builder**: overview, versioned offer/counter timeline, documents package, agreement; cancel danger zone), `/calendar`, `/profile` (incl. open-call manage), `/account` (locale, deletion, **legal/payment identity**). Legacy `/requests`, `/leads/[id]`, and `/opportunities` browse redirect into Bookings / Marketplace / profile as appropriate. Open-call detail may remain at `/opportunities/[id]` for apply/manage.
- Admin: `/[locale]/admin/reviews`, `/accounts/[id]`, `/operations`
- Integrations: `/api/webhooks/esign`, `/api/uploads/rider`, `/api/places/autocomplete`, `/api/places/details`, authorized download route

Discovery authorization is role-scoped: `discover.entertainers` for venue operators/staff; `discover.venues` for entertainers/staff. Dual-role actors may hold both. Queries and pages must enforce this; navigation alone is insufficient.

Use Server Components for initial reads. Use Server Actions for same-origin form mutations where progressive enhancement helps; use Route Handlers for Auth.js, webhooks, uploads/downloads, and external APIs. Every mutation validates Zod input, authorizes, uses an idempotency/concurrency strategy, writes audit events, and returns typed expected errors. Revalidate affected paths/tags after commit.

Key actions include: submit onboarding/profile; Google Places autocomplete/details prefill for buyer venues; publish/close opportunity; apply/withdraw (including one-click apply from venue profile); send profile-origin offer (booking + terms v1); Accept/Counter/Decline on pending offers (Counter/Accept unlock contacts); shortlist/reject applications; send/accept/decline request; send/counter/accept booking terms offers; upload/delete booking-scoped documents; generate agreement package (with addenda snapshot); process signature event; generate optional invoice artifact after confirm; cancel booking; set availability/hold; expire holds; record deposit status (outside negotiation UI); update account legal identity; staff suspend/reactivate.

## 7. Booking and calendar concurrency

- Implement booking transitions as a domain state machine with an allowlist of legal transitions and actor permissions.
- Require an expected version on mutations; reject stale writes and invite the UI to refresh.
- Assign idempotency keys to provider webhooks and high-value mutations.
- When the second valid signature arrives, lock booking/related resources, verify current agreement and absence of conflicts, transition to `confirmed`, create both confirmed calendar entries, and commit atomically.
- Use exclusion constraints for confirmed overlaps and application-level checks for requested/active unexpired holds.
- Expire holds by timestamp during reads and a scheduled Vercel Cron reconciliation job; expiry jobs must be idempotent.
- Store UTC instants and an IANA timezone; format in `Europe/Berlin` by default. Explicitly test DST boundaries.
- External calendar synchronization is a later milestone delivered in phases:
  - Phase A: secure server-side iCalendar/ICS import (busy overlays only) and revocable ICS export for confirmed bookings.
  - Phase B: OAuth-based provider implementations (Google/Microsoft/Apple).
  Keep a narrow `CalendarSyncProvider` boundary and connection model when that work begins; do not claim sync operational beforehand.

## 8. Files and privacy

Define a `FileStore` interface for create-upload, metadata lookup, authorized read, and delete. Production implementation uses private Vercel Blob. Riders allow only reviewed MIME types/extensions (initially PDF), bounded size, randomized keys, checksum, authenticated ownership, authorization on every download, and short-lived access. Add a malware-scanning state/boundary before broad uploads. Never persist secrets, raw file bytes, or permanent public Blob URLs in profile records.

Separate private contact data from discovery projections. Return view models with contact fields omitted unless an audited unlock exists. Avoid logging contact values, OAuth tokens, agreement contents, or signed URLs. Encrypt sensitive values where threat modeling supports it and rely on platform encryption at rest/in transit.

## 9. Agreement and e-signature boundary

Define an `ESignProvider` interface for creating an envelope, retrieving status, obtaining authorized artifact references, and verifying/parsing webhooks. Provide a fake adapter only for tests/local demos. Local domain state remains authoritative after verified provider events. Store provider IDs and event hashes, not credentials. German and English documents must derive from one immutable terms version and template versions; the UI labels German controlling status. No production template is enabled before legal approval.

## 9.1 Invoice artifact boundary

Define an `InvoiceProvider` interface for generating a party-facing invoice PDF (and optionally EN 16931 XML) from a booking terms + legal-identity snapshot. Sandbox adapter first; production DE path targets `@jasy/zugferd` (see `docs/INVOICE_LIBRARY_SPIKE.md`). Never process payments. Store Blob keys and validation status on `booking_invoices`.

## 10. Internationalization and UI

- Use a maintained App Router i18n library such as `next-intl`; catalog files are type/CI checked.
- Resolve locale from route, persist preference, and fall back to English.
- Keep authorization-independent translated messages out of database code; localize typed error keys at the UI boundary.
- Use server-rendered accessible forms, semantic headings/landmarks, keyboard navigation, visible focus, sufficient contrast, useful loading/empty/error states, and responsive layouts.
- Never encode approval or booking state by color alone.

## 11. Security baseline

- Validate all untrusted input and output projections; parameterize queries through Drizzle.
- Apply CSRF protections provided by Auth.js and same-origin Server Actions; verify webhook signatures against raw bodies.
- Rate limit sign-in, application, invitation, upload, profile enquiry, and webhook surfaces.
- Entertainer discovery may filter `availableOn` (ISO date): exclude acts with a blocking calendar entry that Berlin local day (reuse overlap + RRULE expansion). Apply text/category/price filters before busy checks; candidate set capped at 120 profiles per query (`AVAILABLE_ON_CANDIDATE_CAP`).
- Set CSP/security headers, production HTTPS, secure cookies, and least-privilege integration tokens.
- Prevent IDOR with resource-scoped authorization, not opaque IDs alone.
- Audit privileged reads/mutations and approval/contact/signature/calendar changes.
- Define retention, export, and deletion procedures before pilot; comply with GDPR obligations with counsel.
- Run dependency and secret scanning in CI. Never commit `.env*` values.

## 12. Observability and testing

Use structured logs with request/correlation IDs and redaction. Capture errors and performance through a Vercel-compatible provider after provisioning. Track state-transition failures, auth failures, database latency/errors, webhook retries, calendar conflicts, hold-expiry lag, upload failures, and staff actions.

Testing layers:

- Unit: permissions, approval state, booking state machine, agreement/deposit semantics, time/DST logic
- Schema/migration: clean apply, upgrade path, constraints, seed idempotence
- Integration: Auth.js adapter/session, server actions, contact projections, concurrent confirmation, webhook idempotency
- Component/accessibility: critical forms and states in both locales
- E2E: apply → publish → discover → profile offer / application / direct request → Accept|Counter/shortlist/accept (contact unlock) → terms → two signatures → calendar confirmation; standing open-call apply skips holds until dates exist; suspension denial
- Production build and preview smoke test before release

## 13. Deployment and provisioning sequence

External dashboard/account action is required; code alone does not provision production services.

1. Create/link the Vercel project to this private GitHub repository.
2. Install Neon through the Vercel Marketplace and connect it to the project/environments. Do not install legacy Vercel Postgres.
3. Pull Vercel-provisioned environment variables locally; confirm names without printing values.
4. Configure Auth.js secret/base URL and chosen OAuth/email provider credentials/callback URLs.
5. Provision private Vercel Blob and bind its token only when upload work begins.
6. Configure the e-signature sandbox only after an adapter exists; leave production disabled.
7. Apply reviewed migrations to a non-production Neon branch, seed synthetic demo data, then run full verification.
8. Deploy Preview, test authentication/authorization/webhooks/files, then promote deliberately.
9. Apply production migrations as a controlled release step with backup/rollback planning.

## 14. Environment variable names

Names only; values belong in Vercel/environment secret stores:

- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED` (only if provisioning exposes/needs it)
- `AUTH_SECRET`
- `AUTH_URL`
- `AUTH_TRUST_HOST`
- `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` (if GitHub provider selected)
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (if Google provider selected)
- `EMAIL_SERVER`, `EMAIL_FROM` (if email provider selected)
- `BLOB_READ_WRITE_TOKEN`
- `ESIGN_PROVIDER`
- `ESIGN_API_KEY`
- `ESIGN_WEBHOOK_SECRET`
- `ESIGN_TEMPLATE_VERSION_DE`
- `ESIGN_TEMPLATE_VERSION_EN`
- `CRON_SECRET`
- `SENTRY_DSN` (only after provider provisioning)
- `NEXT_PUBLIC_APP_URL`

Maintain `.env.example` with names and comments only. Validation must distinguish build-safe optional integrations from runtime-required production configuration.

## 15. Definition of done for initial production foundation

- Vercel-native Next.js build passes without secrets at compile time.
- A provisioned development environment runs migrations and Auth.js adapter smoke tests.
- Server-side approval/role permissions protect every private query/mutation.
- Core schema, state machines, audit trail, concurrency constraints, seeds, and both locale catalogs are committed.
- No demo bypass can run in production.
- File and e-signature integrations remain honest abstractions until provisioned and verified.
