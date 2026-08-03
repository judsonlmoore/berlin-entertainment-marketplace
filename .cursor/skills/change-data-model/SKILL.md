---
name: change-data-model
description: Evolve the Salon Neon/Drizzle data model safely. Use when adding tables, columns, indexes, constraints, migrations, seeds, or data backfills.
---

# Change the data model

1. Read the data model, migration, and security sections of `docs/TECHNICAL_SPEC.md` plus affected requirements in `docs/PRODUCT_SPEC.md`.
2. Describe current and target invariants, query patterns, nullability, ownership, lifecycle, backfill, and rollback/forward-fix strategy.
3. Modify Drizzle schema, generate SQL, and inspect it. Never edit a migration applied to a shared environment.
4. Add database constraints for invariants and indexes justified by query patterns. Keep amounts integer-cents and times `timestamptz`/UTC with IANA timezone context.
5. Update narrow queries, validation, seed fixtures, and data projections. Avoid exposing private fields.
6. Test clean migration, upgrade with representative data, constraints, seed idempotence, and production build. Flag any destructive or dashboard step before execution.
