---
name: change-booking-calendar
description: Change Salon booking, agreement, signature, deposit, hold, or availability behavior. Use for lifecycle transitions and calendar concurrency work.
---

# Change booking or calendar behavior

1. Read booking/calendar sections in both `docs/PRODUCT_SPEC.md` and `docs/TECHNICAL_SPEC.md`.
2. Write the before/after state transition table, permitted actors, side effects, audit events, idempotency key, and conflict behavior.
3. Preserve invariants: both current-version signatures confirm; deposit is independent; confirmed entries block both resources atomically; expired holds do not block.
4. Implement the domain transition first, then transactional persistence with expected version/locking and database conflict constraints.
5. Test both booking origins, unauthorized/stale/duplicate events, simultaneous confirmation, overlaps, cancellation, hold expiry, time zones, and DST.
6. Update both locales and operational reconciliation paths. Do not treat provider callbacks as trusted without signature verification.
