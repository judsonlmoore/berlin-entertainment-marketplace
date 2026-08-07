# TODOS

## Product / Phase A

### Entertainer profile document library (PDF)

**What:** Titled PDF documents on entertainer profiles with portfolio-like editor (drag/drop, delete, reorder), real private Vercel Blob storage, and visibility `marketplace` | `engagement` (pipeline shortlisted/accepted→confirmed until `endsAt` past). Surfaces: owner editor (all), discovery (marketplace only), booking detail + profile (all docs the viewer may access).

**Why:** Tom needs downloadable tech packs without leaving Salon; replaces vague “tech notes ≥48h notify” with actual files. Fixes stub FileStore that ignored `BLOB_READ_WRITE_TOKEN`.

**Context:** Eng-review 2026-08-06 locked: portfolio-style server upload; shared private-Blob helper; dedicated DocumentEditor (not merged into PortfolioEditor); one access context then filter lists; entertainer-only this PR; no ≥48h cron; no booking free-text notes. Default visibility for any migrated rows = `engagement`. Start from `rider_files` + `portfolio-editor` patterns + `canAccessRiderFile` rewrite.

**Effort:** M
**Priority:** P1
**Depends on:** `BLOB_READ_WRITE_TOKEN` provisioned (portfolio already uses it)

## Product / Phase B

### Tech checklist gate + OOB replacement notify

**What:** Optional hard tech checklist before confirm, plus notification when an entertainer needs out-of-band replacement.

**Why:** Thin reliability layer after Phase A proves one real Salon night — not before.

**Context:** Design hybrid approach D (2026-08-05): Phase B only after Tom’s first night closes on Salon. Do not implement in PR #22. When picked up: booking confirm gate + notification templates; keep scope thin (no chat, no escrow).

**Effort:** L
**Priority:** P3
**Depends on:** Phase A proof (real venue night completed on Salon)

### Shared free-text booking tech notes + waiver

**What:** Optional booking-scoped free-text notes (PA/stage/power/timing) and/or explicit “tech reviewed / waived” stamp.

**Why:** PDFs cover packs; night-specific scribbles or a waiver may still help after first pilots if PDF-only isn’t enough.

**Context:** Cut from eng-review document-library scope (2026-08-06). Distinct from Phase B checklist gate. Revisit after Tom’s first night feedback.

**Effort:** M
**Priority:** P3
**Depends on:** Entertainer document library shipped + Phase A pilot feedback

## Platform

### Venue PDF document library (remainder)

**What:** Finish venue PDF symmetry: `engagement` visibility ACL (talent↔venue open booking) and show venue-owned docs on booking detail for viewers who may access them.

**Why:** Marketplace public list/download ships with venue/talent profile parity; engagement packs (house plot, load-in) still need a counterparty surface for Tom’s night-of prep.

**Context:** Eng-review 2026-08-07. Builder + XOR upload already exist; public marketplace surface is the current parity PR. Do **not** treat this TODO as “start venue PDFs from scratch.” Start from post-parity `rider-access` marketplace XOR; add reverse engagement lookup (viewer entertainer profile id — `ActorContext` has `venueId` only today); wire `ProfileDocumentList` on `/marketplace/bookings/[id]` for venue docs.

**Effort:** M
**Priority:** P2
**Depends on:** Venue/talent public profile parity PR (marketplace venue ACL + download fix)

### City-scoped expansion (beyond Berlin HQ)

**What:** Add a city dimension so discovery, venues, and ops can expand city-by-city without rewriting core booking.

**Why:** Design treats Berlin as launch HQ, not the product ceiling; shipping Berlin-hardcoded forever blocks worldwide growth.

**Context:** Office-hours / design revision (2026-08-05). Do not abstract in PR #22. When ready: city on venues/opportunities + discovery filters; Berlin remains default. Avoid premature multi-tenant complexity before Phase A proof.

**Effort:** L
**Priority:** P4
**Depends on:** Phase A proof; Berlin as sole launch city until then

## Completed

### Private post-gig feedback survey

**What:** After a completed gig, collect private feedback from both parties (no public reviews).

**Why:** Closes the reliability loop for Tom’s first nights without shipping a public review system the product explicitly rejects.

**Context:** Approved design (“Tom’s first reliable night,” 2026-08-05). Implemented on `staging`: `post_gig_surveys`, daily cron reconcile, booking detail form, notification type, DE/EN copy. Gig past = confirmed + `endsAt <= now`. Apply migration `0009` on deploy.

**Effort:** M
**Priority:** P1
**Depends on:** Stable booking completion state

**Completed:** staging (2026-08-06) — pending merge/QA on main as needed
