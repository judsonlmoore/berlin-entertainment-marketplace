# Berlin Entertainment Marketplace (Salon)

Private, curated B2B marketplace connecting Berlin venues with small-format entertainers.

## Specs

1. [Product specification](./docs/PRODUCT_SPEC.md)
2. [Technical specification](./docs/TECHNICAL_SPEC.md)
3. [Cursor handoff runbook](./docs/CURSOR_HANDOFF.md)

## Stack

Next.js App Router, TypeScript, Neon Postgres, Drizzle ORM, Auth.js, next-intl, Vercel.

## Local setup

```bash
npm install
cp .env.example .env
# Pull Vercel/Neon env vars into .env (do not commit):
# npx vercel link && npx vercel env pull .env
```

Required for a working local app:

- `DATABASE_URL` from Neon via Vercel Marketplace
- `AUTH_SECRET` (generate with `openssl rand -base64 32`)
- At least one auth path: OAuth provider credentials **or** `AUTH_DEV_LOGIN=true` for non-production only

```bash
npm run db:generate   # after schema edits
npm run db:migrate
ALLOW_DB_SEED=true npm run db:seed
npm run dev
```

## Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
# or
npm run check
```

## Current foundation slice

- App Router + strict TypeScript + Tailwind foundation
- Core Drizzle schema and migrations for identity, approval, profiles, booking, calendar, agreements
- Auth.js adapter with OAuth hooks and explicit non-production development login
- Central approval + permission domain with tests
- English/German catalogs and locale-prefixed routes
- Account application + staff approval admin surface
- Honest unconfigured file/e-sign integration boundaries

Do not claim Vercel, Neon, Blob, OAuth, or e-sign connectivity until credentials are present and smoke-tested.
