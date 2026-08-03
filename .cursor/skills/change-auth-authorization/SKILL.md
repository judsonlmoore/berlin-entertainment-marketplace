---
name: change-auth-authorization
description: Modify Salon Auth.js authentication, sessions, approval gates, roles, venue membership, or resource permissions. Use for identity and access-control changes.
---

# Change authentication or authorization

1. Read identity/security sections of `docs/TECHNICAL_SPEC.md` and the role matrix in `docs/PRODUCT_SPEC.md`.
2. Enumerate actors, approval states, capabilities, resources, operations, and allow/deny outcomes. Default uncertain cases to deny.
3. Keep Auth.js on the shared Neon/Drizzle database adapter. Treat provider identity as authentication, not marketplace approval.
4. Enforce permission checks in server data/mutation boundaries; route redirects are only early UX. Test IDOR, suspended accounts, cross-venue access, and last-owner protection.
5. Protect session/callback/open-redirect behavior, secrets, logs, and account linking. Any demo bypass must be explicit and impossible in production.
6. Add denial/audit tests and smoke-test configured providers without claiming unprovisioned connectivity.
