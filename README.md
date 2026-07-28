# Pennyward

Pennyward is a personal finance app: accounts, transactions, budgets, and debt
payoff planning, backed by a real Postgres database.

The app lives entirely in `apps/web` — a Next.js 16 (App Router) application.
There is no other frontend in this repo.

## Prerequisites

- Node.js 20+
- A Postgres database (e.g. a free [Neon](https://neon.tech) or
  [Supabase](https://supabase.com) project)
- A Google OAuth client, if you want to test Google sign-in

## Getting started

1. Install dependencies from the repo root:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in your own values:

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

   Fill in `apps/web/.env.local`:

   - `DATABASE_URL` — your Postgres connection string
   - `AUTH_SECRET` — any random string (e.g. `openssl rand -base64 32`)
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — Google OAuth credentials
     (optional; only needed for "Sign in with Google")
   - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — optional, used for
     rate limiting; the app runs fine without them (rate limiting is skipped)

3. Apply migrations and seed the system categories:

   ```bash
   npx prisma migrate deploy --schema=apps/web/prisma/schema.prisma
   npx prisma db seed --schema=apps/web/prisma/schema.prisma
   ```

   (equivalently: `cd apps/web && npx prisma migrate deploy && npx prisma db seed`)

4. Start the dev server:

   ```bash
   npm run dev
   ```

   The app runs at http://localhost:3000. Sign up for a new account from
   `/sign-up` to get started — there's no pre-seeded demo user.

## Scripts

Run from the repo root; each delegates to the `apps/web` workspace:

```bash
npm run dev     # next dev
npm run build   # next build
npm run lint    # eslint
npm run test    # vitest run
```

## Project structure

- `apps/web/app` — Next.js App Router routes (marketing pages, auth, onboarding,
  and the authenticated `/app/*` product)
- `apps/web/app/api` — API route handlers (accounts, categories, transactions,
  CSV import, categorization rules, budgets, debts, payoff scenarios)
- `apps/web/lib` — finance engine, validation schemas, session/auth helpers
- `apps/web/prisma` — Prisma schema, migrations, and seed script
- `apps/web/test` — Vitest test suite (finance engine, API routes, security)

## Scope note

Accounts, categories, transactions, budgets, and debts/payoff planning are
backed by the real database via Prisma. Goals, bills, watchlists,
notifications, and stock quotes/scenarios are out of scope for the current
backend migration and still read/write to browser `localStorage` via the
legacy Zustand store (`apps/web/stores/useStore.ts`). This is expected, not a
bug — those entities are planned for a future migration.
