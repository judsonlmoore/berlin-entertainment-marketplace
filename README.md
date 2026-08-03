# Berlin Entertainment Marketplace

This branch is a **Cursor-ready specification baseline**, not a runnable application. The superseded prototype has been removed intentionally so implementation can begin from the approved product and technical architecture without inheriting starter-specific code or dependencies.

## Start here

1. Read [the product specification](./docs/PRODUCT_SPEC.md).
2. Read [the technical specification](./docs/TECHNICAL_SPEC.md).
3. Follow [the Cursor handoff runbook](./docs/CURSOR_HANDOFF.md).
4. Load the scoped rules in `.cursor/rules/` and use the applicable procedure in `.cursor/skills/`.

## Repository contents

- `docs/PRODUCT_SPEC.md` — product scope, workflows, permissions, acceptance criteria, risks, and pilot metrics
- `docs/TECHNICAL_SPEC.md` — implementation-ready Next.js, Vercel, Neon, Drizzle, Auth.js, Blob, security, and deployment architecture
- `docs/CURSOR_HANDOFF.md` — ordered implementation and provisioning runbook
- `.cursor/rules/` — concise project invariants and engineering rules
- `.cursor/skills/` — repeatable procedures for vertical slices, schema changes, booking/calendar work, authorization, and release verification
- `.env.example` — environment-variable names only; it contains no credentials

## Before implementation

External setup is required: connect this private repository to Vercel, provision Neon Postgres through the Vercel Marketplace, and configure the chosen Auth.js provider. Provision private Vercel Blob and an e-signature sandbox only when those slices begin. Do not use the sunset `@vercel/postgres` product and do not claim an integration is live until credentials are provisioned and smoke-tested.

No build, development, lint, migration, or test commands exist on this baseline. Cursor should scaffold them deliberately by following the handoff and specifications.
