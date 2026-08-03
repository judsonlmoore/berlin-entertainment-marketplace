# Cursor Implementation Handoff

Follow this order. Do not treat the existing visual prototype as production architecture.

1. Read [MARKETPLACE_REQUIREMENTS.md](./MARKETPLACE_REQUIREMENTS.md), [PRODUCT_SPEC.md](./PRODUCT_SPEC.md), [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md), [DESIGN.md](../DESIGN.md), and [VISUAL_DESIGN_SPEC.md](./VISUAL_DESIGN_SPEC.md). Prefer `DESIGN.md` for tokens/type/forms. Open screenshots in [`design-reference/`](./design-reference/) for layout hierarchy only.
2. Load all `.cursor/rules/*.mdc`. Use the relevant `.cursor/skills/*/SKILL.md` procedure for each task.
3. Confirm the requested slice and acceptance criteria. Record any ambiguity that changes permissions, money, agreement, or booking semantics before coding.
4. Provision/link the Vercel project and install Neon Postgres through Vercel Marketplace. Configure Auth.js providers separately. Do not use `@vercel/postgres`, invent credentials, or claim connectivity before a smoke test. Provision Blob only when uploads are implemented.
5. Create a clean Next.js App Router + strict TypeScript foundation on a dedicated branch. Build the visual tokens and authenticated shell from the visual specification; use screenshots as aesthetic/interaction references, never as literal hard-coded content.
6. Add Drizzle schema, reviewed migrations, synthetic seed data, Auth.js database adapter, centralized permissions, i18n foundation, error handling, and CI before feature breadth.
7. Implement vertical slices in this order:
   1. Account/auth + approval
   2. Dual-role profiles + venue membership
   3. **Role-segregated** private discovery + contact projection
   4. Opportunities/applications (including drafts/clarification as needed)
   5. Direct requests (including deadline/propose-changes as needed)
   6. Unified terms/booking state machine
   7. Calendar concurrency (native)
   8. Agreement/signature sandbox boundary
   9. Admin operations
   10. Profile enrichment + portfolio media + private rider/documents
   11. Page metadata / noindex for private routes
   12. Admin/a11y/operational hardening
   13. External calendar sync boundary (separate milestone; do not block earlier slices)
8. For every slice: define authorization and invariants, add/inspect migration if needed, implement server-first read/mutation path, add both locale copy, add tests, run checks, and commit one coherent change.
9. Wire visual parity one route at a time in the order required by `VISUAL_DESIGN_SPEC.md`. Compare the rendered desktop route with its approved screenshot, correct material differences, then verify tablet/mobile and all loading/empty/error/access states before moving forward.
10. Before every commit run formatting (when configured), typecheck, lint, affected unit/integration tests, migration checks, and a production build when architecture/build inputs changed. Use `.cursor/skills/verify-release/SKILL.md` before release.
11. Deploy to Vercel Preview first. Verify real development Auth.js sessions, Neon queries/migrations, protected access, visual parity, responsive/accessibility behavior, and any configured webhooks/uploads. Promote only after external integrations and rollback steps are confirmed.

Required user/dashboard actions: connect the private GitHub repository to Vercel; provision Neon through Vercel Marketplace; create/configure the chosen Auth.js provider; later provision private Vercel Blob and an e-signature sandbox; calendar sync provider only in its milestone. Until completed, keep integrations clearly unconfigured and do not simulate production claims.
