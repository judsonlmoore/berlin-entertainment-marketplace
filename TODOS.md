# TODOS

## Product / Phase A

### Private post-gig feedback survey

**What:** After a completed gig, collect private feedback from both parties (no public reviews).

**Why:** Closes the reliability loop for Tom’s first nights without shipping a public review system the product explicitly rejects.

**Context:** Approved design (“Tom’s first reliable night,” 2026-08-05): no public reviews; private surveys after completed gigs only. Deferred from PR #22 Step 0 so support-mode / profiles / portfolio could ship first. Start from booking → `completed` transition, existing notification patterns, DE/EN copy. Do not add public directories or star ratings.

**Effort:** M
**Priority:** P1
**Depends on:** Stable booking completion state; not blocked by PR #22 support overlay

### Tech notes on booking detail (≥48h)

**What:** Let venue and entertainer capture/share technical notes on the booking (PA, stage, power, timing) with a clear expectation ≥48h before the gig.

**Why:** Prevents last-minute tech surprises that break the audience promise even when casting worked (Tom / Electric Social pain).

**Context:** Design Phase A checklist item; not in PR #22. Distinct from Phase B “tech checklist gate” (hard block). Start from booking detail UI + notification center; DE/EN copy; both parties can read/write with audit. Do not invent escrow or chat.

**Effort:** M
**Priority:** P1
**Depends on:** Existing booking detail surfaces; independent of support-mode PR

## Product / Phase B

### Tech checklist gate + OOB replacement notify

**What:** Optional hard tech checklist before confirm, plus notification when an entertainer needs out-of-band replacement.

**Why:** Thin reliability layer after Phase A proves one real Salon night — not before.

**Context:** Design hybrid approach D (2026-08-05): Phase B only after Tom’s first night closes on Salon. Do not implement in PR #22. When picked up: booking confirm gate + notification templates; keep scope thin (no chat, no escrow).

**Effort:** L
**Priority:** P3
**Depends on:** Phase A proof (real venue night completed on Salon)

## Platform

### City-scoped expansion (beyond Berlin HQ)

**What:** Add a city dimension so discovery, venues, and ops can expand city-by-city without rewriting core booking.

**Why:** Design treats Berlin as launch HQ, not the product ceiling; shipping Berlin-hardcoded forever blocks worldwide growth.

**Context:** Office-hours / design revision (2026-08-05). Do not abstract in PR #22. When ready: city on venues/opportunities + discovery filters; Berlin remains default. Avoid premature multi-tenant complexity before Phase A proof.

**Effort:** L
**Priority:** P4
**Depends on:** Phase A proof; Berlin as sole launch city until then

## Completed
