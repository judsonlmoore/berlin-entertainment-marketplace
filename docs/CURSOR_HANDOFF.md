# Cursor Implementation Handoff

Follow this order. Do not treat the existing visual prototype as production architecture.

1. Read [PRODUCT_SPEC.md](./PRODUCT_SPEC.md), [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md), and [VISUAL_DESIGN_SPEC.md](./VISUAL_DESIGN_SPEC.md) completely. Open all seven approved screenshots in [`design-reference/`](./design-reference/) before making visual decisions.
2. Load all `.cursor/rules/*.mdc`. Use the relevant `.cursor/skills/*/SKILL.md` procedure for each task.
3. Confirm the requested slice and acceptance criteria. Record any ambiguity that changes permissions, money, agreement, or booking semantics before coding.
4. Provision/link the Vercel project and install Neon Postgres through Vercel Marketplace. Configure Auth.js providers separately. Do not use `@vercel/postgres`, invent credentials, or claim connectivity before a smoke test. Provision Blob only when uploads are implemented.
5. Create a clean Next.js App Router + strict TypeScript foundation on a dedicated branch. Build the visual tokens and authenticated shell from the visual specification; use screenshots as aesthetic/interaction references, never as literal hard-coded content.
6. Add Drizzle schema, reviewed migrations, synthetic seed data, Auth.js database adapter, centralized permissions, i18n foundation, error handling, and CI before feature breadth.
7. Implement vertical slices in this order: account/auth + approval; dual-role profiles + venue membership; private discovery/contact projection; opportunities/applications; direct requests; unified terms/booking state machine; calendar concurrency; agreement/signature sandbox boundary; admin operations; private rider upload boundary.
8. For every slice: define authorization and invariants, add/inspect migration if needed, implement server-first read/mutation path, add both locale copy, add tests, run checks, and commit one coherent change.
9. Wire visual parity one route at a time in the order required by `VISUAL_DESIGN_SPEC.md`. Compare the rendered desktop route with its approved screenshot, correct material differences, then verify tablet/mobile and all loading/empty/error/access states before moving forward.
10. Before every commit run formatting (when configured), typecheck, lint, affected unit/integration tests, migration checks, and a production build when architecture/build inputs changed. Use `.cursor/skills/verify-release/SKILL.md` before release.
11. Deploy to Vercel Preview first. Verify real development Auth.js sessions, Neon queries/migrations, protected access, visual parity, responsive/accessibility behavior, and any configured webhooks/uploads. Promote only after external integrations and rollback steps are confirmed.

Required user/dashboard actions: connect the private GitHub repository to Vercel; provision Neon through Vercel Marketplace; create/configure the chosen Auth.js provider; later provision private Vercel Blob and an e-signature sandbox. Until completed, keep integrations clearly unconfigured and do not simulate production claims.
