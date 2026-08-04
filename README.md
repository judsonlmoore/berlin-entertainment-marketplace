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
- OAuth credentials (`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` and/or GitHub)
- Google redirect URI: `http://localhost:3000/api/session/callback/google`
  (production: `https://<your-domain>/api/session/callback/google`)
- Keep `AUTH_URL` set to the public site origin (e.g. `https://entertainment-marketplace.jlm.me`)
- Do not share or bookmark `/api/auth/signin/google` — use `/sign-in`. Auth routes live under `/api/session` to avoid Google Safe Browsing false positives on the default Auth.js paths.

Platform staff is a database flag (`users.is_platform_staff`), not a login mode. After Google sign-in, set it in Neon for your user when needed.

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

## Implemented so far

- App Router + strict TypeScript + Tailwind foundation
- Core Drizzle schema/migrations, Auth.js OAuth (Google/GitHub), database sessions
- Self-serve XOR signup (entertainer or venue), account suspend, venue membership, private discovery projections, profile verification
- English/German catalogs and locale-prefixed routes
- Honest unconfigured file/e-sign integration boundaries

Do not claim Vercel, Neon, Blob, OAuth, or e-sign connectivity until credentials are present and smoke-tested.
