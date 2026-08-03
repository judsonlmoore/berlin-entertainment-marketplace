---
name: verify-release
description: Verify a Salon revision before commit, Preview deployment, or production release. Use for final quality, migration, security, and integration checks.
---

# Verify a release

1. Read definitions of done and acceptance criteria in both `docs/PRODUCT_SPEC.md` and `docs/TECHNICAL_SPEC.md`.
2. Inspect the complete diff for scope drift, secrets, generated artifacts, unreviewed migrations, privacy leaks, and misleading live-integration claims.
3. Run formatting when configured, typecheck, lint, unit/integration/component/E2E tests affected by the diff, migration clean/upgrade checks, and a production build.
4. Verify English/German catalogs, accessibility-critical flows, approval gates, unauthorized denials, contact privacy, booking/calendar concurrency, and audit events.
5. On Preview, smoke-test only actually provisioned Neon/Auth/Blob/e-sign sandbox integrations. Check logs/redaction and rollback readiness.
6. Report pass/fail evidence, external dashboard steps, migration order, known risks, and blockers. Do not waive a failing check silently.
