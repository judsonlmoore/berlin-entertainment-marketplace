---
name: implement-vertical-slice
description: Implement one end-to-end Salon marketplace capability across schema, authorization, server logic, bilingual UI, and tests. Use for a new workflow or coherent product feature.
---

# Implement a vertical slice

1. Read `docs/PRODUCT_SPEC.md`, `docs/TECHNICAL_SPEC.md`, and applicable `.cursor/rules/*.mdc` completely.
2. State the slice, actor, entry point, terminal outcome, acceptance criteria, exclusions, and authorization matrix.
3. Identify schema/migration, concurrency, privacy, audit, i18n, and external-integration impacts before editing.
4. Implement in order: domain types/state rules; schema/migration; server query/action/handler; minimal Server Component UI; client interaction; English/German copy; tests.
5. Return only authorized view models. Audit privileged/state-changing operations and revalidate affected data after commit.
6. Run typecheck, lint, affected tests, migration checks, and production build when relevant. Summarize remaining provisioning or risk honestly.
