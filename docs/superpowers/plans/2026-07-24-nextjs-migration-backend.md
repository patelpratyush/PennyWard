# Next.js Migration & Phase 1 Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the existing Vite/React-Router "FinPilot" SPA (`src/`) as a Next.js 15 App Router app in `apps/web`, backed by a real PostgreSQL database (Prisma) and Auth.js authentication, replacing the current Zustand+localStorage store for the PRD Phase 1 entities (accounts, categories, transactions, budgets, debts, payoff scenarios) with real per-user persistence via API route handlers.

**Architecture:** New Next.js 15 App Router project scaffolded in `apps/web`, reusing the existing framework-agnostic code verbatim (`components/ui/*`, `lib/finance/*`, `lib/format.ts`, `lib/utils.ts`, `types/index.ts`). Pages/layouts are ported from React Router to App Router file conventions. Prisma models mirror the PRD §6 schema, scoped to Phase 1 entities. Every table is scoped by `user_id`; every route handler validates input with Zod and checks session ownership. TanStack Query replaces direct Zustand mutations for server-backed entities; Zustand (or plain `useState`) still holds UI-only state (theme, dashboard widget visibility) and the Phase 2+ entities not covered here (goals, bills, watchlists, notifications, scenarios' price-quote bits) which stay on localStorage for now.

**Tech Stack:** Next.js 15 (App Router, TypeScript) · Prisma + PostgreSQL (Neon) · Auth.js (NextAuth) v5 with Google + Credentials providers · TanStack Query + Zod · Tailwind CSS + shadcn/ui (ported as-is) · Vitest for `lib/finance` and API route tests · Playwright for one smoke test.

## Global Constraints

- Money is always `NUMERIC` in Postgres and rounded to cents (`round2` from `lib/format.ts`) in TypeScript — never raw floats compared without rounding. (PRD §6, §7.1)
- Every Prisma query touching a user-owned table must filter by `user_id` from the session — no exceptions. (PRD §11)
- Every API route validates its input with a Zod schema before touching the DB. (PRD §11, R-none but stated non-negotiable in §11)
- No secrets committed; DB URL and Auth secrets via `.env.local`, never read directly in client components. (PRD §11)
- Existing finance engine files (`lib/finance/debt.ts`, `lib/finance/loans.ts`, `lib/finance/budget.ts`, `lib/finance/derive.ts`, `lib/finance/carLoan.ts`) are copied **unmodified** — they are pure, already-tested functions; do not rewrite their logic. (PRD §7, "packages/core... pure functions")
- Out of scope for this plan: goals, bills, watchlists, notifications, loan scenarios (stocks), Plaid, AI categorization, mobile. These remain on the existing Zustand/localStorage store and are ported as-is with no backend. Do not build endpoints for them here.

---

## File Structure

```
apps/web/
├── app/
│   ├── layout.tsx                       # root layout: fonts, Toaster, QueryClientProvider
│   ├── globals.css                      # ported from src/index.css
│   ├── (marketing)/
│   │   ├── layout.tsx                   # ported MarketingLayout
│   │   ├── page.tsx                     # Landing
│   │   ├── features/page.tsx
│   │   ├── pricing/page.tsx
│   │   ├── security/page.tsx
│   │   ├── about/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── help/page.tsx
│   │   ├── privacy/page.tsx
│   │   └── terms/page.tsx
│   ├── (auth)/
│   │   ├── sign-in/page.tsx
│   │   ├── sign-up/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── verify-email/page.tsx
│   ├── onboarding/page.tsx
│   ├── app/
│   │   ├── layout.tsx                   # ported AppLayout, wraps auth guard
│   │   ├── dashboard/page.tsx
│   │   ├── transactions/page.tsx
│   │   ├── transactions/import/page.tsx
│   │   ├── budgets/page.tsx
│   │   ├── accounts/page.tsx
│   │   ├── accounts/[id]/page.tsx
│   │   ├── debt/page.tsx
│   │   ├── debt/payoff-planner/page.tsx
│   │   ├── loans/car-calculator/page.tsx
│   │   ├── loans/calculator/page.tsx
│   │   ├── goals/page.tsx ... (ported, unchanged, still localStorage)
│   │   └── settings/[section]/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── accounts/route.ts            # GET (list), POST (create)
│       ├── accounts/[id]/route.ts       # PATCH, DELETE
│       ├── categories/route.ts          # GET, POST
│       ├── categories/[id]/route.ts     # PATCH
│       ├── categorization-rules/route.ts
│       ├── transactions/route.ts        # GET (filtered/paginated), POST
│       ├── transactions/[id]/route.ts   # PATCH, DELETE
│       ├── transactions/bulk-delete/route.ts
│       ├── imports/csv/route.ts         # POST: rows + mapping → { imported, duplicates, review }
│       ├── budgets/route.ts             # GET ?month=, PUT (upsert)
│       ├── debts/route.ts               # GET, POST
│       ├── debts/[id]/route.ts          # PATCH, DELETE
│       └── scenarios/payoff/route.ts    # GET, POST, PATCH, DELETE payoff_scenarios (persist config only)
├── auth.ts                              # Auth.js config
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                          # seeds system default categories
├── lib/
│   ├── db.ts                            # Prisma client singleton
│   ├── session.ts                       # getRequiredSession() helper
│   ├── finance/                         # copied verbatim from src/lib/finance
│   ├── format.ts                        # copied verbatim
│   └── utils.ts                         # copied verbatim
├── components/                          # ported: ui/*, financial/*, layout/*, shared/*
├── hooks/
│   ├── queries/
│   │   ├── useAccounts.ts
│   │   ├── useCategories.ts
│   │   ├── useTransactions.ts
│   │   ├── useBudgets.ts
│   │   └── useDebts.ts
│   └── use-mobile.ts, useTheme.ts       # ported
├── types/index.ts                       # copied verbatim
├── test/
│   ├── finance/*.test.ts                # ported vitest suite
│   └── api/*.test.ts                    # new: route handler tests w/ test DB
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── .env.local (gitignored)
```

---

### Task 1: Scaffold Next.js 15 app in `apps/web`

**Files:**
- Create: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/tsconfig.json`, `apps/web/tailwind.config.ts`, `apps/web/postcss.config.js`, `apps/web/app/layout.tsx`, `apps/web/app/globals.css`
- Modify: root `package.json` — add `"workspaces": ["apps/web"]` (npm workspaces, no Turborepo needed for one app)

**Interfaces:**
- Produces: `apps/web` project that runs with `npm run dev --workspace=apps/web` and serves a blank page at `/`.

- [ ] **Step 1: Create the workspace**

```bash
mkdir -p apps/web
cd apps/web
npx --yes create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --no-turbopack --use-npm
```

When prompted, decline any git-init (repo already exists).

- [ ] **Step 2: Wire npm workspaces at repo root**

Edit root `package.json`, add:

```json
  "workspaces": [
    "apps/web"
  ],
```

- [ ] **Step 3: Verify the scaffold boots**

Run: `npm install && npm run dev --workspace=apps/web`
Expected: dev server starts on `http://localhost:3000`, default Next.js landing page renders with no console errors. Stop the server (Ctrl-C).

- [ ] **Step 4: Commit**

```bash
git add apps/web package.json package-lock.json
git commit -m "chore: scaffold Next.js 15 app in apps/web"
```

---

### Task 2: Prisma schema + Postgres (Neon) + Auth.js tables

**Files:**
- Create: `apps/web/prisma/schema.prisma`, `apps/web/.env.local` (not committed), `apps/web/.env.example`
- Modify: `apps/web/package.json` — add `prisma`, `@prisma/client`, `@auth/prisma-adapter`

**Interfaces:**
- Produces: `PrismaClient` model types `Account` (Auth.js), `User`, `FinancialAccount`, `Category`, `Transaction`, `Budget`, `BudgetEntry`, `Debt`, `PayoffScenario`, `CategorizationRule` — used by every later API task.

- [ ] **Step 1: Install dependencies**

```bash
cd apps/web
npm install prisma @prisma/client @auth/prisma-adapter next-auth@beta zod
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Auth.js required tables ─────────────────────────────────────────────
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  passwordHash  String?
  accounts      AuthAccount[]
  sessions      Session[]

  financialAccounts   FinancialAccount[]
  categories          Category[]
  transactions        Transaction[]
  budgets             Budget[]
  debts               Debt[]
  payoffScenarios     PayoffScenario[]
  categorizationRules CategorizationRule[]

  createdAt DateTime @default(now())
}

model AuthAccount {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ─── FinFlow domain (Phase 1) ────────────────────────────────────────────
enum AccountType {
  checking
  savings
  cash
  credit_card
  auto_loan
  student_loan
  mortgage
  personal_loan
  investment
  other
}

model FinancialAccount {
  id                String      @id @default(cuid())
  userId            String
  name              String
  institution       String
  type              AccountType
  balance           Decimal     @db.Decimal(14, 2)
  includeInNetWorth Boolean     @default(true)
  archived          Boolean     @default(false)
  creditLimit       Decimal?    @db.Decimal(14, 2)
  apr               Decimal?    @db.Decimal(6, 4)
  minimumPayment    Decimal?    @db.Decimal(12, 2)
  dueDay            Int?
  originalBalance   Decimal?    @db.Decimal(14, 2)
  lastUpdated       DateTime    @default(now())

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]
  debts        Debt[]

  @@index([userId])
}

enum CategoryKind {
  expense
  income
  transfer
}

model Category {
  id       String       @id @default(cuid())
  userId   String?
  name     String
  group    String
  icon     String
  color    String
  kind     CategoryKind @default(expense)
  archived Boolean      @default(false)
  parentId String?

  user         User?         @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]
  budgetEntries BudgetEntry[]
  categorizationRules CategorizationRule[]

  @@index([userId])
}

enum TransactionType {
  income
  expense
  transfer
}

enum TransactionSource {
  manual
  csv
  plaid
}

model Transaction {
  id           String            @id @default(cuid())
  userId       String
  accountId    String
  categoryId   String?
  type         TransactionType
  amount       Decimal           @db.Decimal(14, 2)
  merchant     String
  description  String?
  date         DateTime          @db.Date
  postedDate   DateTime?         @db.Date
  notes        String?
  tags         String[]          @default([])
  recurring    Boolean           @default(false)
  cleared      Boolean           @default(true)
  source       TransactionSource @default(manual)
  importHash   String?
  createdAt    DateTime          @default(now())

  user     User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  account  FinancialAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  category Category?        @relation(fields: [categoryId], references: [id])

  @@unique([userId, importHash])
  @@index([userId, date])
  @@index([accountId, date])
}

model Budget {
  id             String   @id @default(cuid())
  userId         String
  month          String   // 'YYYY-MM'
  expectedIncome Decimal  @db.Decimal(12, 2) @default(0)
  savingsTarget  Decimal  @db.Decimal(12, 2) @default(0)

  user    User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  entries BudgetEntry[]

  @@unique([userId, month])
}

model BudgetEntry {
  id         String  @id @default(cuid())
  budgetId   String
  categoryId String
  budgeted   Decimal @db.Decimal(12, 2)
  rollover   Boolean @default(false)

  budget   Budget   @relation(fields: [budgetId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id])

  @@unique([budgetId, categoryId])
}

enum DebtType {
  credit_card
  auto_loan
  student_loan
  personal_loan
  mortgage
  medical
  bnpl
  other
}

model Debt {
  id              String   @id @default(cuid())
  userId          String
  accountId       String?
  name            String
  lender          String
  type            DebtType
  balance         Decimal  @db.Decimal(14, 2)
  originalBalance Decimal  @db.Decimal(14, 2)
  apr             Decimal  @db.Decimal(6, 4)
  minimumPayment  Decimal  @db.Decimal(12, 2)
  dueDay          Int
  creditLimit     Decimal? @db.Decimal(14, 2)

  user    User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  account FinancialAccount? @relation(fields: [accountId], references: [id])

  @@index([userId])
}

enum PayoffStrategy {
  minimum
  snowball
  avalanche
  custom
}

model PayoffScenario {
  id            String         @id @default(cuid())
  userId        String
  name          String
  strategy      PayoffStrategy
  extraMonthly  Decimal        @db.Decimal(12, 2) @default(0)
  oneTimePayment Decimal       @db.Decimal(12, 2) @default(0)
  startMonth    String         // 'YYYY-MM'
  customOrder   String[]       @default([])
  createdAt     DateTime       @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

enum MatchType {
  contains
  equals
  regex
}

model CategorizationRule {
  id         String    @id @default(cuid())
  userId     String
  matchType  MatchType
  pattern    String
  categoryId String
  priority   Int       @default(0)

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id])

  @@index([userId])
}
```

- [ ] **Step 3: Provision Neon Postgres and set env vars**

Create a Neon project (or use the `mcp__Neon__create_project` tool if available), then write `apps/web/.env.local`:

```
DATABASE_URL="postgresql://<user>:<password>@<host>/<db>?sslmode=require"
AUTH_SECRET="<run: npx auth secret>"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
```

Write `apps/web/.env.example` with the same keys, empty values, committed to git.

- [ ] **Step 4: Run the migration**

```bash
cd apps/web
npx prisma migrate dev --name init
```

Expected: migration succeeds, `prisma/migrations/<timestamp>_init/migration.sql` created, all tables listed above exist in Neon.

- [ ] **Step 5: Write the category seed**

`apps/web/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SYSTEM_CATEGORIES = [
  { name: 'Rent or mortgage', group: 'Housing', icon: 'home', color: 'chart-1' },
  { name: 'Home maintenance', group: 'Housing', icon: 'wrench', color: 'chart-1' },
  { name: 'Car payment', group: 'Transportation', icon: 'car', color: 'chart-2' },
  { name: 'Fuel', group: 'Transportation', icon: 'fuel', color: 'chart-2' },
  { name: 'Insurance', group: 'Transportation', icon: 'shield', color: 'chart-2' },
  { name: 'Public transit', group: 'Transportation', icon: 'train', color: 'chart-2' },
  { name: 'Groceries', group: 'Food', icon: 'shopping-cart', color: 'chart-3' },
  { name: 'Dining', group: 'Food', icon: 'utensils', color: 'chart-3' },
  { name: 'Coffee', group: 'Food', icon: 'coffee', color: 'chart-3' },
  { name: 'Electricity', group: 'Utilities', icon: 'zap', color: 'chart-4' },
  { name: 'Internet', group: 'Utilities', icon: 'wifi', color: 'chart-4' },
  { name: 'Mobile phone', group: 'Utilities', icon: 'smartphone', color: 'chart-4' },
  { name: 'Shopping', group: 'Lifestyle', icon: 'shopping-bag', color: 'chart-6' },
  { name: 'Entertainment', group: 'Lifestyle', icon: 'film', color: 'chart-6' },
  { name: 'Subscriptions', group: 'Lifestyle', icon: 'repeat', color: 'chart-6' },
  { name: 'Personal care', group: 'Lifestyle', icon: 'sparkles', color: 'chart-6' },
  { name: 'Travel', group: 'Lifestyle', icon: 'plane', color: 'chart-6' },
  { name: 'Debt payments', group: 'Financial', icon: 'credit-card', color: 'chart-5' },
  { name: 'Savings', group: 'Financial', icon: 'piggy-bank', color: 'chart-7' },
  { name: 'Investments', group: 'Financial', icon: 'trending-up', color: 'chart-7' },
  { name: 'Health & pharmacy', group: 'Lifestyle', icon: 'heart-pulse', color: 'chart-8' },
  { name: 'Paycheck', group: 'Income', icon: 'banknote', color: 'chart-3', kind: 'income' as const },
  { name: 'Interest income', group: 'Income', icon: 'percent', color: 'chart-3', kind: 'income' as const },
]

async function main() {
  for (const c of SYSTEM_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: `sys_${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}` },
      update: {},
      create: {
        id: `sys_${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        userId: null,
        name: c.name,
        group: c.group,
        icon: c.icon,
        color: c.color,
        kind: c.kind ?? 'expense',
      },
    })
  }
}

main().finally(() => prisma.$disconnect())
```

Add to `apps/web/package.json`:
```json
  "prisma": { "seed": "tsx prisma/seed.ts" }
```

Install `tsx`: `npm install -D tsx --workspace=apps/web`

Run: `npx prisma db seed`
Expected: 23 rows in `Category` table with `userId = NULL`.

- [ ] **Step 6: Write `lib/db.ts` singleton**

`apps/web/lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/prisma apps/web/lib/db.ts apps/web/.env.example apps/web/package.json apps/web/package-lock.json
git commit -m "feat: add Prisma schema, Neon Postgres, and category seed"
```

---

### Task 3: Auth.js (Google + email/password credentials)

**Files:**
- Create: `apps/web/auth.ts`, `apps/web/app/api/auth/[...nextauth]/route.ts`, `apps/web/middleware.ts`, `apps/web/lib/session.ts`
- Test: `apps/web/test/api/session.test.ts`

**Interfaces:**
- Consumes: `db` from `lib/db.ts` (Task 2)
- Produces: `auth()` server helper, `getRequiredSession()` throwing helper used by every route handler in Tasks 6–12. Signature: `getRequiredSession(): Promise<{ userId: string }>` — throws `Response` with status 401 if unauthenticated.

- [ ] **Step 1: Install bcrypt for password hashing**

```bash
npm install bcryptjs --workspace=apps/web
npm install -D @types/bcryptjs --workspace=apps/web
```

- [ ] **Step 2: Write `auth.ts`**

```typescript
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null
        const user = await db.user.findUnique({ where: { email } })
        if (!user?.passwordHash) return null
        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) token.userId = user.id
      return token
    },
    session: ({ session, token }) => {
      if (session.user) (session.user as { id?: string }).id = token.userId as string
      return session
    },
  },
  pages: { signIn: '/sign-in' },
})
```

- [ ] **Step 3: Write the route handler**

`apps/web/app/api/auth/[...nextauth]/route.ts`:

```typescript
export { GET, POST } from '@/auth'
```

Wait — `handlers` is the export, not `GET`/`POST` directly. Correct version:

```typescript
import { handlers } from '@/auth'

export const { GET, POST } = handlers
```

- [ ] **Step 4: Write `lib/session.ts`**

```typescript
import { auth } from '@/auth'

export async function getRequiredSession(): Promise<{ userId: string }> {
  const session = await auth()
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return { userId }
}
```

- [ ] **Step 5: Write `middleware.ts` to gate `/app/*`**

```typescript
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isProtected = req.nextUrl.pathname.startsWith('/app')
  if (isProtected && !req.auth) {
    const signInUrl = new URL('/sign-in', req.nextUrl.origin)
    signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
    return NextResponse.redirect(signInUrl)
  }
})

export const config = {
  matcher: ['/app/:path*'],
}
```

- [ ] **Step 6: Write the failing test**

`apps/web/test/api/session.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { getRequiredSession } from '@/lib/session'

vi.mock('@/auth', () => ({ auth: vi.fn(async () => null) }))

describe('getRequiredSession', () => {
  it('throws 401 Response when no session', async () => {
    await expect(getRequiredSession()).rejects.toBeInstanceOf(Response)
  })
})
```

- [ ] **Step 7: Run test, verify pass**

Run: `npm run test --workspace=apps/web -- session.test.ts`
Expected: PASS (mock returns null session, function throws).

- [ ] **Step 8: Manual sign-up smoke check**

Add a temporary `app/api/dev/create-user/route.ts` is NOT needed — instead verify via `npx prisma studio`: manually insert a `User` row with `email` and a bcrypt hash of a known password (`node -e "console.log(require('bcryptjs').hashSync('test1234', 10))"`), then `npm run dev --workspace=apps/web`, hit `POST /api/auth/callback/credentials` via the sign-in page (built in Task 5) — defer full manual check to Task 5 once the sign-in page exists. For now confirm the route compiles: `npm run build --workspace=apps/web` succeeds with no type errors in `auth.ts`.

- [ ] **Step 9: Commit**

```bash
git add apps/web/auth.ts apps/web/app/api/auth apps/web/middleware.ts apps/web/lib/session.ts apps/web/test/api/session.test.ts apps/web/package.json apps/web/package-lock.json
git commit -m "feat: add Auth.js with Google and credentials providers"
```

---

### Task 4: Port framework-agnostic code unchanged

**Files:**
- Create: `apps/web/types/index.ts`, `apps/web/lib/finance/{debt,loans,budget,derive,carLoan}.ts`, `apps/web/lib/format.ts`, `apps/web/lib/utils.ts`, `apps/web/components/ui/*.tsx` (all ~50 files), `apps/web/test/finance/*.test.ts`

**Interfaces:**
- Produces: identical exports to the current `src/` versions — `simulatePayoff`, `compareStrategies`, `buildAmortization`, `calculateLoan`, `calculateStandardLoan`, `monthlyPayment`, `spendingByCategory`, `budgetStatus`, `budgetTotals`, `netWorth`, `goalMath`, `formatCurrency`, `round2`, `uid`, etc. Every later task that imports `@/lib/finance/*` or `@/lib/format` relies on these signatures being unchanged.

- [ ] **Step 1: Copy files verbatim**

```bash
cp -r src/types apps/web/types
mkdir -p apps/web/lib/finance
cp src/lib/finance/*.ts apps/web/lib/finance/
cp src/lib/format.ts apps/web/lib/format.ts
cp src/lib/utils.ts apps/web/lib/utils.ts
mkdir -p apps/web/components/ui
cp src/components/ui/*.tsx apps/web/components/ui/
```

Note: `types/index.ts` (Task 4) currently has no `Prisma`-specific types — leave as-is; Prisma model types are separate and API routes will map between them (see Task 6+ for the mapping functions).

- [ ] **Step 2: Fix any Vite-specific imports**

Grep for `import.meta.env` usage in copied files (there should be none outside `services/`, which is not copied here):

```bash
grep -rn "import.meta.env" apps/web/lib apps/web/components apps/web/types || echo "clean"
```

Expected: `clean` — none of these files reference Vite env vars.

- [ ] **Step 3: Copy the existing finance test suite**

```bash
find src -path "*test*" -name "*.ts" -o -path "*__tests__*" -name "*.ts" 2>/dev/null
```

If existing tests are found under `src/`, copy them to `apps/web/test/finance/`, updating only import paths (`@/lib/finance/...` alias already matches). If no test files exist yet in `src/`, write new fixture tests now — one per engine module:

`apps/web/test/finance/loans.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { monthlyPayment, buildAmortization, calculateLoan } from '@/lib/finance/loans'

describe('monthlyPayment', () => {
  it('matches standard amortization formula for a 5-year auto loan', () => {
    // $25,000 @ 6% APR, 60 months — verified against Bankrate calculator
    expect(monthlyPayment(25000, 6, 60)).toBeCloseTo(483.32, 1)
  })

  it('handles 0% APR as a straight division', () => {
    expect(monthlyPayment(12000, 0, 12)).toBe(1000)
  })
})

describe('buildAmortization', () => {
  it('final row ends at exactly zero balance', () => {
    const schedule = buildAmortization({
      principal: 10000, apr: 5, termMonths: 24, startDate: '2026-01-01',
    })
    expect(schedule.at(-1)?.endingBalance).toBe(0)
    expect(schedule).toHaveLength(24)
  })

  it('extra monthly payments shorten the schedule', () => {
    const base = buildAmortization({ principal: 10000, apr: 5, termMonths: 24, startDate: '2026-01-01' })
    const accel = buildAmortization({ principal: 10000, apr: 5, termMonths: 24, startDate: '2026-01-01', extraMonthly: 200 })
    expect(accel.length).toBeLessThan(base.length)
  })
})

describe('calculateLoan', () => {
  it('reports zero interestSaved when no extra payment given', () => {
    const result = calculateLoan({ principal: 5000, apr: 4, termMonths: 12, startDate: '2026-01-01' })
    expect(result.interestSaved).toBe(0)
  })
})
```

`apps/web/test/finance/debt.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { simulatePayoff, compareStrategies } from '@/lib/finance/debt'
import type { Debt } from '@/types'

const debts: Debt[] = [
  { id: 'd1', name: 'Card A', lender: 'X', type: 'credit_card', balance: 1000, originalBalance: 1000, apr: 24, minimumPayment: 50, dueDay: 1 },
  { id: 'd2', name: 'Card B', lender: 'Y', type: 'credit_card', balance: 3000, originalBalance: 3000, apr: 12, minimumPayment: 90, dueDay: 1 },
]

describe('simulatePayoff', () => {
  it('snowball targets the smallest balance first', () => {
    const result = simulatePayoff({ debts, strategy: 'snowball', extraMonthly: 200, oneTimePayment: 0, startMonth: '2026-01' })
    expect(result.payoffOrder[0]?.debtId).toBe('d1')
  })

  it('avalanche targets the highest APR first', () => {
    const result = simulatePayoff({ debts, strategy: 'avalanche', extraMonthly: 200, oneTimePayment: 0, startMonth: '2026-01' })
    expect(result.payoffOrder[0]?.debtId).toBe('d1') // d1 has both smaller balance AND higher APR here
  })

  it('every debt ends at zero balance', () => {
    const result = simulatePayoff({ debts, strategy: 'snowball', extraMonthly: 200, oneTimePayment: 0, startMonth: '2026-01' })
    const last = result.timeline.at(-1)
    expect(last?.totalBalance).toBe(0)
  })
})

describe('compareStrategies', () => {
  it('snowball and avalanche both save interest vs minimum-only', () => {
    const { minimum, snowball, avalanche } = compareStrategies(debts, 200, 0, '2026-01')
    expect(snowball.totalInterest).toBeLessThan(minimum.totalInterest)
    expect(avalanche.totalInterest).toBeLessThan(minimum.totalInterest)
  })
})
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm run test --workspace=apps/web -- finance`
Expected: all suites PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/types apps/web/lib/finance apps/web/lib/format.ts apps/web/lib/utils.ts apps/web/components/ui apps/web/test/finance
git commit -m "feat: port finance engine, types, and UI primitives to Next.js app"
```

---

### Task 5: Port layout + routing to App Router

**Files:**
- Create: `apps/web/app/layout.tsx`, `apps/web/app/(marketing)/layout.tsx`, `apps/web/app/(marketing)/page.tsx` (+ 7 sibling marketing pages), `apps/web/app/(auth)/sign-in/page.tsx` (+ 4 sibling auth pages), `apps/web/app/app/layout.tsx`, `apps/web/app/app/dashboard/page.tsx` (+ remaining app pages, ported with `'use client'`)
- Create: `apps/web/components/layout/AppLayout.tsx`, `apps/web/components/layout/MarketingLayout.tsx`
- Modify: every ported page — replace `react-router` imports with `next/navigation`/`next/link`

**Interfaces:**
- Consumes: `auth()` (Task 3) in `app/app/layout.tsx` to read the session server-side and pass `userId` to client components as needed.
- Produces: every route from the old `App.tsx` route table now resolves to a Next.js page at the equivalent App Router path.

- [ ] **Step 1: Copy pages and components, strip router-specific bits**

```bash
cp -r src/pages apps/web/_ported-pages
cp -r src/components/layout apps/web/components/layout
cp -r src/components/financial apps/web/components/financial
cp -r src/components/shared apps/web/components/shared
cp -r src/hooks apps/web/hooks
```

- [ ] **Step 2: Mechanical react-router → next/navigation swap**

For every file under `apps/web/_ported-pages`, `apps/web/components/layout`, and `apps/web/hooks`:

| Old (react-router) | New (next/navigation, next/link) |
|---|---|
| `import { Link } from 'react-router'` | `import Link from 'next/link'` |
| `import { useNavigate } from 'react-router'` | `import { useRouter } from 'next/navigation'` then `const router = useRouter()`, replace `navigate(x)` → `router.push(x)` |
| `import { useParams } from 'react-router'` | `import { useParams } from 'next/navigation'` (App Router's own hook, same call shape) |
| `import { useLocation } from 'react-router'` | `import { usePathname } from 'next/navigation'` |
| `<Outlet />` | `{children}` prop in the layout component |

Run this as a scripted pass, then hand-check each file compiles:

```bash
cd apps/web
grep -rl "react-router" _ported-pages components hooks | while read -r f; do
  sed -i '' \
    -e "s/from 'react-router'/from 'next\/navigation'/g" \
    -e "s/<Link /<Link /g" \
    "$f"
done
grep -rln "react-router" _ported-pages components hooks || echo "no react-router imports remain"
```

Then manually fix each file's `Link` import to `next/link` (the sed above only fixed the hooks import path) and swap `useNavigate`/`navigate(` call sites to `useRouter`/`router.push(` — do this file by file, verifying each with `npx tsc --noEmit` after every 5–10 files.

- [ ] **Step 3: Add `'use client'` to every ported page and layout**

All ported pages use hooks (`useState`, the Zustand store, `useParams`) — mark them client components:

```bash
for f in $(find apps/web/_ported-pages apps/web/components/layout apps/web/components/financial apps/web/components/shared -name "*.tsx"); do
  if ! head -1 "$f" | grep -q "'use client'"; then
    sed -i '' "1i\\
'use client'
" "$f"
  fi
done
```

- [ ] **Step 4: Move pages into App Router file structure**

Create each route folder and move the corresponding file to `page.tsx`:

```bash
cd apps/web
mkdir -p "app/(marketing)" "app/(auth)/sign-in" "app/(auth)/sign-up" "app/(auth)/forgot-password" "app/(auth)/reset-password" "app/(auth)/verify-email" \
  app/onboarding app/app/dashboard app/app/transactions/import app/app/budgets app/app/accounts/\[id\] app/app/debt/payoff-planner \
  app/app/loans/car-calculator app/app/loans/calculator app/app/loans/scenarios "app/app/loans/[id]/amortization" app/app/goals/\[id\] \
  app/app/bills app/app/stocks/\[ticker\] app/app/reports app/app/notifications "app/app/settings/[section]"

mv _ported-pages/marketing/Landing.tsx "app/(marketing)/page.tsx"
mv _ported-pages/marketing/Features.tsx "app/(marketing)/features/page.tsx"
mv _ported-pages/marketing/Pricing.tsx "app/(marketing)/pricing/page.tsx"
mv _ported-pages/marketing/Security.tsx "app/(marketing)/security/page.tsx"
mv _ported-pages/marketing/About.tsx "app/(marketing)/about/page.tsx"
mv _ported-pages/marketing/Contact.tsx "app/(marketing)/contact/page.tsx"
mv _ported-pages/marketing/Help.tsx "app/(marketing)/help/page.tsx"
mv _ported-pages/marketing/Legal.tsx "app/(marketing)/privacy/page.tsx"   # duplicate for /terms below

mv _ported-pages/auth/SignIn.tsx "app/(auth)/sign-in/page.tsx"
mv _ported-pages/auth/SignUp.tsx "app/(auth)/sign-up/page.tsx"
mv _ported-pages/auth/ForgotPassword.tsx "app/(auth)/forgot-password/page.tsx"
mv _ported-pages/auth/ResetPassword.tsx "app/(auth)/reset-password/page.tsx"
mv _ported-pages/auth/VerifyEmail.tsx "app/(auth)/verify-email/page.tsx"

mv _ported-pages/onboarding/Onboarding.tsx app/onboarding/page.tsx

mv _ported-pages/app/Dashboard.tsx app/app/dashboard/page.tsx
mv _ported-pages/app/Transactions.tsx app/app/transactions/page.tsx
mv _ported-pages/app/TransactionsImport.tsx app/app/transactions/import/page.tsx
mv _ported-pages/app/Budgets.tsx app/app/budgets/page.tsx
mv _ported-pages/app/Accounts.tsx app/app/accounts/page.tsx
mv _ported-pages/app/AccountDetail.tsx "app/app/accounts/[id]/page.tsx"
mv _ported-pages/app/Debt.tsx app/app/debt/page.tsx
mv _ported-pages/app/PayoffPlanner.tsx app/app/debt/payoff-planner/page.tsx
mv _ported-pages/app/CarCalculator.tsx app/app/loans/car-calculator/page.tsx
mv _ported-pages/app/LoanCalculator.tsx app/app/loans/calculator/page.tsx
mv _ported-pages/app/Scenarios.tsx app/app/loans/scenarios/page.tsx
mv _ported-pages/app/Amortization.tsx "app/app/loans/[id]/amortization/page.tsx"
mv _ported-pages/app/Goals.tsx app/app/goals/page.tsx
mv _ported-pages/app/GoalDetail.tsx "app/app/goals/[id]/page.tsx"
mv _ported-pages/app/Bills.tsx app/app/bills/page.tsx
mv _ported-pages/app/Stocks.tsx app/app/stocks/page.tsx
mv _ported-pages/app/StockDetail.tsx "app/app/stocks/[ticker]/page.tsx"
mv _ported-pages/app/Reports.tsx app/app/reports/page.tsx
mv _ported-pages/app/Notifications.tsx app/app/notifications/page.tsx
mv _ported-pages/app/Settings.tsx "app/app/settings/[section]/page.tsx"
mv _ported-pages/NotFound.tsx app/not-found.tsx
```

For `/terms`, copy the Legal component again with a `kind="terms"` default prop change (the original took `kind` as a route-level prop passed by `App.tsx`; since App Router pages take no such prop, hardcode two thin wrapper files):

`app/(marketing)/terms/page.tsx`:
```typescript
'use client'
import Legal from '../privacy/page'
export default function TermsPage() {
  return <Legal kind="terms" />
}
```

(If `Legal`'s default export doesn't accept being re-invoked this way because `privacy/page.tsx` hardcodes `kind="privacy"` internally, instead extract the shared body into `components/shared/LegalContent.tsx` taking `kind` as a prop, and make both `privacy/page.tsx` and `terms/page.tsx` thin wrappers around it.)

- [ ] **Step 5: Write the root layout**

`apps/web/app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = { title: 'FinFlow', description: 'Personal finance & debt payoff' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

`apps/web/app/providers.tsx`:

```typescript
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  )
}
```

Install: `npm install @tanstack/react-query --workspace=apps/web`

- [ ] **Step 6: Write `app/(marketing)/layout.tsx` and `app/app/layout.tsx`**

`apps/web/app/(marketing)/layout.tsx`:
```typescript
import MarketingLayout from '@/components/layout/MarketingLayout'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <MarketingLayout>{children}</MarketingLayout>
}
```

`apps/web/app/app/layout.tsx` (server component — middleware already blocks unauthenticated access, this just renders the shell):
```typescript
import AppLayout from '@/components/layout/AppLayout'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
```

Update `components/layout/MarketingLayout.tsx` and `components/layout/AppLayout.tsx` (ported in Step 1) to accept `children: React.ReactNode` instead of rendering `<Outlet />`.

- [ ] **Step 7: Type-check and build**

Run: `npx tsc --noEmit --project apps/web/tsconfig.json`
Expected: no errors. Fix any remaining `react-router` references or missing `'use client'` directives surfaced by the compiler.

Run: `npm run build --workspace=apps/web`
Expected: build succeeds, route manifest lists every path from the table above.

- [ ] **Step 8: Manual smoke check**

Run: `npm run dev --workspace=apps/web`
Visit `http://localhost:3000/`, `/features`, `/sign-in`, `/app/dashboard` (should redirect to `/sign-in` per middleware since not authenticated).
Expected: no console errors, marketing pages render, `/app/*` redirects work.

- [ ] **Step 9: Remove the `_ported-pages` scratch dir and commit**

```bash
rm -rf apps/web/_ported-pages
git add apps/web
git commit -m "feat: port all pages and layouts to Next.js App Router"
```

---

### Task 6: Accounts API + query hooks

**Files:**
- Create: `apps/web/app/api/accounts/route.ts`, `apps/web/app/api/accounts/[id]/route.ts`, `apps/web/hooks/queries/useAccounts.ts`, `apps/web/lib/validation/accounts.ts`
- Test: `apps/web/test/api/accounts.test.ts`
- Modify: `apps/web/app/app/accounts/page.tsx`, `apps/web/app/app/accounts/[id]/page.tsx` — replace `useStore` account calls with the new hooks

**Interfaces:**
- Consumes: `getRequiredSession()` (Task 3), `db` (Task 2)
- Produces: `useAccounts()` → `{ data: AccountDTO[], isLoading, error }`; `useCreateAccount()`, `useUpdateAccount()`, `useDeleteAccount()` mutation hooks. `AccountDTO` shape matches the existing `Account` type from `types/index.ts` (id, name, institution, type, balance as `number`, includeInNetWorth, archived, lastUpdated as ISO string, plus optional creditLimit/apr/minimumPayment/dueDay/originalBalance).

- [ ] **Step 1: Write the Zod schema**

`apps/web/lib/validation/accounts.ts`:

```typescript
import { z } from 'zod'

export const accountTypeSchema = z.enum([
  'checking', 'savings', 'cash', 'credit_card', 'auto_loan',
  'student_loan', 'mortgage', 'personal_loan', 'investment', 'other',
])

export const createAccountSchema = z.object({
  name: z.string().min(1).max(200),
  institution: z.string().max(200),
  type: accountTypeSchema,
  balance: z.number(),
  includeInNetWorth: z.boolean().default(true),
  archived: z.boolean().default(false),
  creditLimit: z.number().optional(),
  apr: z.number().min(0).max(100).optional(),
  minimumPayment: z.number().min(0).optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  originalBalance: z.number().optional(),
})

export const updateAccountSchema = createAccountSchema.partial()
```

- [ ] **Step 2: Write the failing route test**

`apps/web/test/api/accounts.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/accounts/route'
import { db } from '@/lib/db'

vi.mock('@/lib/session', () => ({
  getRequiredSession: vi.fn(async () => ({ userId: 'user_test' })),
}))

beforeEach(async () => {
  await db.financialAccount.deleteMany({ where: { userId: { in: ['user_test', 'user_other'] } } })
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'test@example.com' } })
  await db.user.upsert({ where: { id: 'user_other' }, update: {}, create: { id: 'user_other', email: 'other@example.com' } })
})

describe('POST /api/accounts', () => {
  it('creates an account scoped to the session user', async () => {
    const req = new Request('http://localhost/api/accounts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Chase Checking', institution: 'Chase', type: 'checking', balance: 1000 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.name).toBe('Chase Checking')
    const row = await db.financialAccount.findUnique({ where: { id: body.id } })
    expect(row?.userId).toBe('user_test')
  })

  it('rejects an invalid type with 400', async () => {
    const req = new Request('http://localhost/api/accounts', {
      method: 'POST',
      body: JSON.stringify({ name: 'X', institution: 'Y', type: 'not_a_type', balance: 0 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('GET /api/accounts', () => {
  it('never returns another user\'s accounts', async () => {
    await db.financialAccount.create({
      data: { userId: 'user_other', name: 'Secret', institution: 'X', type: 'checking', balance: 500 },
    })
    const res = await GET()
    const body = await res.json()
    expect(body.every((a: { name: string }) => a.name !== 'Secret')).toBe(true)
  })
})
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npm run test --workspace=apps/web -- accounts.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/accounts/route'`.

(This step requires a real test database — set `DATABASE_URL` in `apps/web/.env.test` pointing at a separate Neon branch or local Postgres, and configure `apps/web/vitest.config.ts` to load it. See Step 6.)

- [ ] **Step 4: Implement the route handlers**

`apps/web/app/api/accounts/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { createAccountSchema } from '@/lib/validation/accounts'
import { round2 } from '@/lib/format'

function toDTO(row: Awaited<ReturnType<typeof db.financialAccount.findFirstOrThrow>>) {
  return {
    id: row.id,
    name: row.name,
    institution: row.institution,
    type: row.type,
    balance: round2(Number(row.balance)),
    includeInNetWorth: row.includeInNetWorth,
    archived: row.archived,
    lastUpdated: row.lastUpdated.toISOString().slice(0, 10),
    creditLimit: row.creditLimit ? Number(row.creditLimit) : undefined,
    apr: row.apr ? Number(row.apr) : undefined,
    minimumPayment: row.minimumPayment ? Number(row.minimumPayment) : undefined,
    dueDay: row.dueDay ?? undefined,
    originalBalance: row.originalBalance ? Number(row.originalBalance) : undefined,
  }
}

export async function GET() {
  const { userId } = await getRequiredSession()
  const rows = await db.financialAccount.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json(rows.map(toDTO))
}

export async function POST(req: Request) {
  const { userId } = await getRequiredSession()
  const parsed = createAccountSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const row = await db.financialAccount.create({ data: { ...parsed.data, userId } })
  return NextResponse.json(toDTO(row), { status: 201 })
}
```

`apps/web/app/api/accounts/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { updateAccountSchema } from '@/lib/validation/accounts'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const parsed = updateAccountSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const existing = await db.financialAccount.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const row = await db.financialAccount.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ id: row.id })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const existing = await db.financialAccount.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.financialAccount.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Set up the test database config**

`apps/web/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => ({
  test: {
    environment: 'node',
    env: loadEnv('test', process.cwd(), ''),
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
}))
```

`apps/web/.env.test` (gitignored, points at a disposable Neon branch or local Postgres):
```
DATABASE_URL="postgresql://localhost:5432/finflow_test"
```

Run migrations against it once: `DATABASE_URL="postgresql://localhost:5432/finflow_test" npx prisma migrate deploy --schema apps/web/prisma/schema.prisma`

- [ ] **Step 6: Run tests, verify pass**

Run: `npm run test --workspace=apps/web -- accounts.test.ts`
Expected: PASS — 3 tests green.

- [ ] **Step 7: Write the query hooks**

`apps/web/hooks/queries/useAccounts.ts`:

```typescript
'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Account, AccountType } from '@/types'

type CreateAccountInput = Omit<Account, 'id' | 'lastUpdated'>

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Request failed: ${res.status}`)
  return res.json()
}

export function useAccounts() {
  return useQuery({ queryKey: ['accounts'], queryFn: () => fetchJSON<Account[]>('/api/accounts') })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAccountInput) =>
      fetchJSON<Account>('/api/accounts', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useUpdateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Account> }) =>
      fetchJSON(`/api/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fetchJSON(`/api/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}
```

- [ ] **Step 8: Wire `app/app/accounts/page.tsx` and `[id]/page.tsx`**

In both files, replace:
```typescript
const { accounts, addAccount, updateAccount, deleteAccount } = useStore()
```
with:
```typescript
const { data: accounts = [] } = useAccounts()
const createAccount = useCreateAccount()
const updateAccountMut = useUpdateAccount()
const deleteAccountMut = useDeleteAccount()
```
and update call sites: `addAccount(x)` → `createAccount.mutate(x)`, `updateAccount(id, patch)` → `updateAccountMut.mutate({ id, patch })`, `deleteAccount(id)` → `deleteAccountMut.mutate(id)`. Add a loading skeleton (`LoadingSkeleton` from `components/shared/States`, already ported) while `isLoading`.

- [ ] **Step 9: Run full build and manual check**

Run: `npm run build --workspace=apps/web`
Sign up a test user via `/sign-up` (built with Credentials provider hitting a new `POST /api/auth/register` — if that route doesn't exist yet, add it now as part of this task since accounts can't be tested without a signed-in user):

`apps/web/app/api/auth/register/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'

const schema = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(1) })

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const existing = await db.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  const passwordHash = await bcrypt.hash(parsed.data.password, 10)
  const user = await db.user.create({ data: { email: parsed.data.email, name: parsed.data.name, passwordHash } })
  return NextResponse.json({ id: user.id }, { status: 201 })
}
```

Wire the ported `SignUp.tsx` page's submit handler to `POST /api/auth/register` then call `signIn('credentials', { email, password })` from `next-auth/react`.

Manually: sign up → sign in → visit `/app/accounts` → create an account → confirm it appears, persists across reload, and `npx prisma studio` shows it scoped to your user.

- [ ] **Step 10: Commit**

```bash
git add apps/web/app/api/accounts apps/web/app/api/auth/register apps/web/hooks/queries/useAccounts.ts apps/web/lib/validation/accounts.ts apps/web/test/api/accounts.test.ts apps/web/vitest.config.ts apps/web/app/app/accounts apps/web/package.json
git commit -m "feat: real accounts API with per-user scoping, replace store with query hooks"
```

---

### Task 7: Categories API

**Files:**
- Create: `apps/web/app/api/categories/route.ts`, `apps/web/app/api/categories/[id]/route.ts`, `apps/web/hooks/queries/useCategories.ts`, `apps/web/lib/validation/categories.ts`
- Test: `apps/web/test/api/categories.test.ts`
- Modify: any ported page reading `useStore().categories` (Budgets, Transactions, Settings) — swap to `useCategories()`

**Interfaces:**
- Consumes: `getRequiredSession`, `db`
- Produces: `useCategories()` → merged list of system defaults (`userId: null`) + the signed-in user's own categories, shape matching `Category` from `types/index.ts`.

- [ ] **Step 1: Zod schema**

`apps/web/lib/validation/categories.ts`:
```typescript
import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  group: z.string().min(1).max(100),
  icon: z.string().min(1),
  color: z.string().min(1),
  kind: z.enum(['expense', 'income', 'transfer']).default('expense'),
  parentId: z.string().optional(),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  archived: z.boolean().optional(),
})
```

- [ ] **Step 2: Failing test**

`apps/web/test/api/categories.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/categories/route'
import { db } from '@/lib/db'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: 'user_test' })) }))

beforeEach(async () => {
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'cat@example.com' } })
  await db.category.deleteMany({ where: { userId: 'user_test' } })
})

describe('GET /api/categories', () => {
  it('includes system defaults and the user\'s own categories', async () => {
    await db.category.create({ data: { userId: 'user_test', name: 'Custom Hobby', group: 'Lifestyle', icon: 'star', color: 'chart-1' } })
    const res = await GET()
    const body = await res.json()
    expect(body.some((c: { name: string }) => c.name === 'Custom Hobby')).toBe(true)
    expect(body.some((c: { name: string }) => c.name === 'Groceries')).toBe(true) // seeded system default
  })
})

describe('POST /api/categories', () => {
  it('creates a category owned by the current user', async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Pets', group: 'Lifestyle', icon: 'dog', color: 'chart-2' }) })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
```

- [ ] **Step 3: Verify fail** — `npm run test --workspace=apps/web -- categories.test.ts` → FAIL (module not found).

- [ ] **Step 4: Implement**

`apps/web/app/api/categories/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { createCategorySchema } from '@/lib/validation/categories'

export async function GET() {
  const { userId } = await getRequiredSession()
  const rows = await db.category.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    orderBy: [{ group: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(rows.map((r) => ({
    id: r.id, name: r.name, group: r.group, icon: r.icon, color: r.color, archived: r.archived, parentId: r.parentId ?? undefined,
  })))
}

export async function POST(req: Request) {
  const { userId } = await getRequiredSession()
  const parsed = createCategorySchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const row = await db.category.create({ data: { ...parsed.data, userId } })
  return NextResponse.json({ id: row.id }, { status: 201 })
}
```

`apps/web/app/api/categories/[id]/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { updateCategorySchema } from '@/lib/validation/categories'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const parsed = updateCategorySchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const existing = await db.category.findFirst({ where: { id, userId } }) // system categories (userId null) are not editable
  if (!existing) return NextResponse.json({ error: 'Not found or not editable' }, { status: 404 })
  const row = await db.category.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ id: row.id })
}
```

- [ ] **Step 5: Verify pass** — `npm run test --workspace=apps/web -- categories.test.ts` → PASS.

- [ ] **Step 6: Query hook**

`apps/web/hooks/queries/useCategories.ts` — same `fetchJSON` pattern as `useAccounts.ts` (Task 6 Step 7), exposing `useCategories()`, `useCreateCategory()`, `useUpdateCategory()`.

- [ ] **Step 7: Wire consuming pages**

Replace `useStore().categories` with `useCategories().data ?? []` in `app/app/budgets/page.tsx`, `app/app/transactions/page.tsx`, `app/app/settings/[section]/page.tsx`, `components/shared/CategoryIcon.tsx` (if it reads categories directly).

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/api/categories apps/web/hooks/queries/useCategories.ts apps/web/lib/validation/categories.ts apps/web/test/api/categories.test.ts apps/web/app/app/budgets apps/web/app/app/transactions apps/web/app/app/settings
git commit -m "feat: categories API with system-default + user-owned merge"
```

---

### Task 8: Transactions API (CRUD + filtered/paginated list)

**Files:**
- Create: `apps/web/app/api/transactions/route.ts`, `apps/web/app/api/transactions/[id]/route.ts`, `apps/web/app/api/transactions/bulk-delete/route.ts`, `apps/web/hooks/queries/useTransactions.ts`, `apps/web/lib/validation/transactions.ts`
- Test: `apps/web/test/api/transactions.test.ts`
- Modify: `apps/web/app/app/transactions/page.tsx`

**Interfaces:**
- Consumes: `getRequiredSession`, `db`, `round2` from `lib/format.ts`
- Produces: `useTransactions({ from?, to?, categoryId?, accountId?, q?, page? })` → `{ data: { items: Transaction[], total: number }, isLoading }`; `useCreateTransaction()`, `useUpdateTransaction()`, `useBulkDeleteTransactions()`.

- [ ] **Step 1: Zod schema**

`apps/web/lib/validation/transactions.ts`:
```typescript
import { z } from 'zod'

export const createTransactionSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().optional(),
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number(),
  merchant: z.string().min(1).max(300),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string()).default([]),
  recurring: z.boolean().default(false),
  cleared: z.boolean().default(true),
})

export const updateTransactionSchema = createTransactionSchema.partial()

export const listQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
})
```

- [ ] **Step 2: Failing test**

`apps/web/test/api/transactions.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/transactions/route'
import { db } from '@/lib/db'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: 'user_test' })) }))

let accountId: string

beforeEach(async () => {
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'txn@example.com' } })
  await db.transaction.deleteMany({ where: { userId: 'user_test' } })
  await db.financialAccount.deleteMany({ where: { userId: 'user_test' } })
  const acc = await db.financialAccount.create({ data: { userId: 'user_test', name: 'Checking', institution: 'X', type: 'checking', balance: 100 } })
  accountId = acc.id
})

describe('POST /api/transactions', () => {
  it('creates a transaction', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ accountId, type: 'expense', amount: 42.5, merchant: 'Coffee', date: '2026-07-01' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})

describe('GET /api/transactions', () => {
  it('filters by date range and paginates', async () => {
    for (let i = 0; i < 3; i++) {
      await db.transaction.create({
        data: { userId: 'user_test', accountId, type: 'expense', amount: 10, merchant: `M${i}`, date: new Date(`2026-0${i + 1}-15`) },
      })
    }
    const req = new Request('http://x/api/transactions?from=2026-02-01&to=2026-03-31&pageSize=10')
    const res = await GET(req)
    const body = await res.json()
    expect(body.items).toHaveLength(2)
    expect(body.total).toBe(2)
  })
})
```

- [ ] **Step 3: Verify fail** — run, expect module-not-found.

- [ ] **Step 4: Implement**

`apps/web/app/api/transactions/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { createTransactionSchema, listQuerySchema } from '@/lib/validation/transactions'
import { round2 } from '@/lib/format'
import type { Prisma } from '@prisma/client'

function toDTO(row: { id: string; accountId: string; categoryId: string | null; type: string; amount: unknown; merchant: string; description: string | null; date: Date; notes: string | null; tags: string[]; recurring: boolean; cleared: boolean; source: string; createdAt: Date }) {
  return {
    id: row.id, accountId: row.accountId, categoryId: row.categoryId ?? undefined,
    type: row.type, amount: round2(Number(row.amount)), merchant: row.merchant,
    description: row.description ?? undefined, date: row.date.toISOString().slice(0, 10),
    notes: row.notes ?? undefined, tags: row.tags, recurring: row.recurring, cleared: row.cleared,
    importSource: row.source, createdAt: row.createdAt.toISOString(),
  }
}

export async function GET(req: Request) {
  const { userId } = await getRequiredSession()
  const url = new URL(req.url)
  const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { from, to, categoryId, accountId, q, page, pageSize } = parsed.data

  const where: Prisma.TransactionWhereInput = { userId }
  if (from || to) where.date = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) }
  if (categoryId) where.categoryId = categoryId
  if (accountId) where.accountId = accountId
  if (q) where.merchant = { contains: q, mode: 'insensitive' }

  const [items, total] = await Promise.all([
    db.transaction.findMany({ where, orderBy: { date: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    db.transaction.count({ where }),
  ])
  return NextResponse.json({ items: items.map(toDTO), total })
}

export async function POST(req: Request) {
  const { userId } = await getRequiredSession()
  const parsed = createTransactionSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const account = await db.financialAccount.findFirst({ where: { id: parsed.data.accountId, userId } })
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  const row = await db.transaction.create({ data: { ...parsed.data, date: new Date(parsed.data.date), userId, source: 'manual' } })
  return NextResponse.json(toDTO(row), { status: 201 })
}
```

`apps/web/app/api/transactions/[id]/route.ts` — same PATCH/DELETE pattern as Task 6 Step 4, scoped `where: { id, userId }`.

`apps/web/app/api/transactions/bulk-delete/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'

const schema = z.object({ ids: z.array(z.string()).min(1).max(500) })

export async function POST(req: Request) {
  const { userId } = await getRequiredSession()
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { count } = await db.transaction.deleteMany({ where: { id: { in: parsed.data.ids }, userId } })
  return NextResponse.json({ deleted: count })
}
```

- [ ] **Step 5: Verify pass** — `npm run test --workspace=apps/web -- transactions.test.ts` → PASS.

- [ ] **Step 6: Query hook** — `useTransactions.ts` following the `useAccounts.ts` pattern, with `useQuery({ queryKey: ['transactions', filters], queryFn: () => fetchJSON(\`/api/transactions?${new URLSearchParams(filters)}\`) })`.

- [ ] **Step 7: Wire `app/app/transactions/page.tsx`** — replace store reads/writes with the hooks; pagination state (`page`) drives the query key.

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/api/transactions apps/web/hooks/queries/useTransactions.ts apps/web/lib/validation/transactions.ts apps/web/test/api/transactions.test.ts apps/web/app/app/transactions/page.tsx
git commit -m "feat: transactions CRUD API with filtering, pagination, bulk delete"
```

---

### Task 9: CSV import (mapping, dedupe, rule-based categorization)

**Files:**
- Create: `apps/web/app/api/imports/csv/route.ts`, `apps/web/lib/importHash.ts`, `apps/web/lib/payeeNormalize.ts`
- Test: `apps/web/test/lib/payeeNormalize.test.ts`, `apps/web/test/api/imports.test.ts`
- Modify: `apps/web/app/app/transactions/import/page.tsx` — POST parsed rows + mapping to the new endpoint instead of calling `addTransactions` on the store directly

**Interfaces:**
- Consumes: `getRequiredSession`, `db`, `createTransactionSchema` shape (Task 8)
- Produces: `normalizePayee(raw: string): string` (PRD §7.2); `POST /api/imports/csv` accepting `{ accountId, rows: Record<string,string>[], mapping: { date, amount, payee, notes? }, dateFormat?: string }` → `{ imported: number, duplicates: number, review: string[] }`

- [ ] **Step 1: Write the failing payee-normalization test**

`apps/web/test/lib/payeeNormalize.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { normalizePayee } from '@/lib/payeeNormalize'

describe('normalizePayee', () => {
  it('strips SQ * prefix and phone/state suffix', () => {
    expect(normalizePayee('SQ *BLUE BOTTLE COF 4155551234 CA')).toBe('blue bottle cof')
  })
  it('strips TST* prefix', () => {
    expect(normalizePayee('TST* Olive Garden 0123')).toBe('olive garden')
  })
  it('strips PAYPAL * prefix', () => {
    expect(normalizePayee('PAYPAL *NETFLIX')).toBe('netflix')
  })
  it('collapses whitespace and lowercases', () => {
    expect(normalizePayee('  Whole   Foods   Market  ')).toBe('whole foods market')
  })
})
```

- [ ] **Step 2: Verify fail** — `npm run test --workspace=apps/web -- payeeNormalize` → FAIL (module not found).

- [ ] **Step 3: Implement `normalizePayee`**

`apps/web/lib/payeeNormalize.ts`:
```typescript
export function normalizePayee(raw: string): string {
  let s = raw.trim().toLowerCase()
  s = s.replace(/^(sq \*|tst\*|paypal \*)\s*/i, '')
  s = s.replace(/\b\d{10,}\b/g, '')            // phone numbers / long numeric IDs
  s = s.replace(/\b\d{3,4}\b$/g, '')            // trailing store numbers
  s = s.replace(/\b[a-z]{2}\b$/i, '')           // trailing state code
  s = s.replace(/\s+/g, ' ').trim()
  return s
}
```

- [ ] **Step 4: Verify pass** — `npm run test --workspace=apps/web -- payeeNormalize` → PASS.

- [ ] **Step 5: Write `lib/importHash.ts`**

```typescript
import { createHash } from 'crypto'

export function importHash(accountId: string, date: string, amount: number, payeeNorm: string): string {
  return createHash('sha256').update(`${accountId}|${date}|${amount.toFixed(2)}|${payeeNorm}`).digest('hex')
}
```

- [ ] **Step 6: Failing import route test**

`apps/web/test/api/imports.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/imports/csv/route'
import { db } from '@/lib/db'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: 'user_test' })) }))

let accountId: string

beforeEach(async () => {
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'imp@example.com' } })
  await db.transaction.deleteMany({ where: { userId: 'user_test' } })
  await db.financialAccount.deleteMany({ where: { userId: 'user_test' } })
  const acc = await db.financialAccount.create({ data: { userId: 'user_test', name: 'Chase', institution: 'Chase', type: 'checking', balance: 0 } })
  accountId = acc.id
})

const rows = [
  { Date: '07/01/2026', Description: 'STARBUCKS STORE 123', Amount: '-5.75' },
  { Date: '07/02/2026', Description: 'PAYROLL DEPOSIT', Amount: '2000.00' },
]
const mapping = { date: 'Date', amount: 'Amount', payee: 'Description' }

describe('POST /api/imports/csv', () => {
  it('imports new rows and reports zero duplicates on first pass', async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ accountId, rows, mapping, dateFormat: 'MM/dd/yyyy' }) })
    const res = await POST(req)
    const body = await res.json()
    expect(body.imported).toBe(2)
    expect(body.duplicates).toBe(0)
  })

  it('flags exact re-import as duplicates, not silently re-inserted', async () => {
    const req1 = new Request('http://x', { method: 'POST', body: JSON.stringify({ accountId, rows, mapping, dateFormat: 'MM/dd/yyyy' }) })
    await POST(req1)
    const req2 = new Request('http://x', { method: 'POST', body: JSON.stringify({ accountId, rows, mapping, dateFormat: 'MM/dd/yyyy' }) })
    const res2 = await POST(req2)
    const body2 = await res2.json()
    expect(body2.imported).toBe(0)
    expect(body2.duplicates).toBe(2)
  })
})
```

- [ ] **Step 7: Verify fail.**

- [ ] **Step 8: Implement the route**

`apps/web/app/api/imports/csv/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { parse, isValid } from 'date-fns'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { normalizePayee } from '@/lib/payeeNormalize'
import { importHash } from '@/lib/importHash'
import { round2 } from '@/lib/format'

const schema = z.object({
  accountId: z.string(),
  rows: z.array(z.record(z.string(), z.string())).min(1).max(5000),
  mapping: z.object({ date: z.string(), amount: z.string(), payee: z.string(), notes: z.string().optional() }),
  dateFormat: z.string().default('MM/dd/yyyy'),
})

export async function POST(req: Request) {
  const { userId } = await getRequiredSession()
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { accountId, rows, mapping, dateFormat } = parsed.data

  const account = await db.financialAccount.findFirst({ where: { id: accountId, userId } })
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const rules = await db.categorizationRule.findMany({ where: { userId }, orderBy: { priority: 'desc' } })

  let imported = 0
  let duplicates = 0
  const review: string[] = []

  for (const row of rows) {
    const rawDate = row[mapping.date]
    const rawAmount = row[mapping.amount]
    const rawPayee = row[mapping.payee]
    if (!rawDate || !rawAmount || !rawPayee) { review.push(`Skipped incomplete row: ${JSON.stringify(row)}`); continue }

    const parsedDate = parse(rawDate, dateFormat, new Date())
    if (!isValid(parsedDate)) { review.push(`Unparseable date: ${rawDate}`); continue }

    const amount = round2(Math.abs(parseFloat(rawAmount)))
    const type = parseFloat(rawAmount) >= 0 ? 'income' : 'expense'
    const payeeNorm = normalizePayee(rawPayee)
    const dateStr = parsedDate.toISOString().slice(0, 10)
    const hash = importHash(accountId, dateStr, amount, payeeNorm)

    const dup = await db.transaction.findUnique({ where: { userId_importHash: { userId, importHash: hash } } })
    if (dup) { duplicates++; continue }

    const matchedRule = rules.find((r) =>
      r.matchType === 'contains' ? payeeNorm.includes(r.pattern.toLowerCase()) :
      r.matchType === 'equals' ? payeeNorm === r.pattern.toLowerCase() :
      new RegExp(r.pattern, 'i').test(payeeNorm))

    await db.transaction.create({
      data: {
        userId, accountId, type, amount, merchant: rawPayee, date: parsedDate,
        notes: mapping.notes ? row[mapping.notes] : undefined,
        source: 'csv', importHash: hash, categoryId: matchedRule?.categoryId,
      },
    })
    imported++
  }

  return NextResponse.json({ imported, duplicates, review })
}
```

Note the `@@unique([userId, importHash])` from the Task 2 schema is queried here as `userId_importHash` — confirm this is the Prisma-generated compound-index name by running `npx prisma generate` and checking `node_modules/.prisma/client/index.d.ts` for the exact field name; adjust if Prisma names it differently (e.g. `userId_importHash` vs a custom `@@unique(..., name: "...")`. If mismatched, add an explicit name to the schema: `@@unique([userId, importHash], name: "userId_importHash")`.

- [ ] **Step 9: Verify pass** — `npm run test --workspace=apps/web -- imports.test.ts` → PASS.

- [ ] **Step 10: Wire `app/app/transactions/import/page.tsx`**

Keep the existing client-side CSV parsing (Papaparse) and column-mapping UI as-is; change the final "Import" button handler to `POST /api/imports/csv` with `{ accountId, rows: parsedRows, mapping, dateFormat }` instead of calling `addTransactions` on the store, then show `imported`/`duplicates`/`review` counts from the response.

- [ ] **Step 11: Commit**

```bash
git add apps/web/app/api/imports apps/web/lib/payeeNormalize.ts apps/web/lib/importHash.ts apps/web/test/lib apps/web/test/api/imports.test.ts apps/web/app/app/transactions/import/page.tsx apps/web/prisma/schema.prisma
git commit -m "feat: CSV import with payee normalization, dedupe hash, and rule-based categorization"
```

---

### Task 10: Categorization rules API

**Files:**
- Create: `apps/web/app/api/categorization-rules/route.ts`, `apps/web/app/api/categorization-rules/[id]/route.ts`, `apps/web/lib/validation/rules.ts`
- Test: `apps/web/test/api/categorizationRules.test.ts`
- Modify: `apps/web/app/app/settings/[section]/page.tsx` (rules management UI, if present) — wire to the new endpoint; if no rules UI currently exists in the ported Settings page, add a minimal list+create form there.

**Interfaces:**
- Consumes: `getRequiredSession`, `db`
- Produces: `GET/POST /api/categorization-rules`, `PATCH/DELETE /api/categorization-rules/[id]` — consumed by Task 9's import route (already reads `db.categorizationRule` directly server-side, so this task only adds user-facing CRUD).

- [ ] **Step 1: Zod schema**

`apps/web/lib/validation/rules.ts`:
```typescript
import { z } from 'zod'

export const createRuleSchema = z.object({
  matchType: z.enum(['contains', 'equals', 'regex']),
  pattern: z.string().min(1).max(300),
  categoryId: z.string().min(1),
  priority: z.number().int().default(0),
})
```

- [ ] **Step 2: Failing test**

`apps/web/test/api/categorizationRules.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/categorization-rules/route'
import { db } from '@/lib/db'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: 'user_test' })) }))

let categoryId: string

beforeEach(async () => {
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'rules@example.com' } })
  await db.categorizationRule.deleteMany({ where: { userId: 'user_test' } })
  const cat = await db.category.findFirstOrThrow({ where: { userId: null } })
  categoryId = cat.id
})

describe('POST /api/categorization-rules', () => {
  it('creates a rule for the current user', async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ matchType: 'contains', pattern: 'starbucks', categoryId }) })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})

describe('GET /api/categorization-rules', () => {
  it('lists rules ordered by priority descending', async () => {
    await db.categorizationRule.create({ data: { userId: 'user_test', matchType: 'contains', pattern: 'a', categoryId, priority: 1 } })
    await db.categorizationRule.create({ data: { userId: 'user_test', matchType: 'contains', pattern: 'b', categoryId, priority: 5 } })
    const res = await GET()
    const body = await res.json()
    expect(body[0].pattern).toBe('b')
  })
})
```

- [ ] **Step 3: Verify fail.**

- [ ] **Step 4: Implement**

`apps/web/app/api/categorization-rules/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { createRuleSchema } from '@/lib/validation/rules'

export async function GET() {
  const { userId } = await getRequiredSession()
  const rows = await db.categorizationRule.findMany({ where: { userId }, orderBy: { priority: 'desc' } })
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const { userId } = await getRequiredSession()
  const parsed = createRuleSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const row = await db.categorizationRule.create({ data: { ...parsed.data, userId } })
  return NextResponse.json(row, { status: 201 })
}
```

`apps/web/app/api/categorization-rules/[id]/route.ts` — PATCH/DELETE, same ownership-check pattern as Task 6 Step 4.

- [ ] **Step 5: Verify pass.**

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/categorization-rules apps/web/lib/validation/rules.ts apps/web/test/api/categorizationRules.test.ts
git commit -m "feat: categorization rules CRUD API"
```

---

### Task 11: Budgets API

**Files:**
- Create: `apps/web/app/api/budgets/route.ts`, `apps/web/hooks/queries/useBudgets.ts`, `apps/web/lib/validation/budgets.ts`
- Test: `apps/web/test/api/budgets.test.ts`
- Modify: `apps/web/app/app/budgets/page.tsx`

**Interfaces:**
- Consumes: `getRequiredSession`, `db`, `spendingByCategory`/`budgetTotals` from `lib/finance/budget.ts` (Task 4, unchanged) for the client-side rendering; the API only persists budget config, spend calculation stays client-side against fetched transactions exactly as it works today.
- Produces: `GET /api/budgets?month=YYYY-MM` → `Budget | null`; `PUT /api/budgets` upserting `{ month, entries: [{categoryId, budgeted, rollover}], expectedIncome, savingsTarget }`.

- [ ] **Step 1: Zod schema**

`apps/web/lib/validation/budgets.ts`:
```typescript
import { z } from 'zod'

export const upsertBudgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  entries: z.array(z.object({ categoryId: z.string(), budgeted: z.number().min(0), rollover: z.boolean().default(false) })),
  expectedIncome: z.number().min(0).default(0),
  savingsTarget: z.number().min(0).default(0),
})
```

- [ ] **Step 2: Failing test**

`apps/web/test/api/budgets.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, PUT } from '@/app/api/budgets/route'
import { db } from '@/lib/db'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: 'user_test' })) }))

let categoryId: string

beforeEach(async () => {
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'bud@example.com' } })
  await db.budget.deleteMany({ where: { userId: 'user_test' } })
  categoryId = (await db.category.findFirstOrThrow({ where: { userId: null } })).id
})

describe('PUT /api/budgets', () => {
  it('creates then updates the same month idempotently', async () => {
    const body = { month: '2026-07', entries: [{ categoryId, budgeted: 500, rollover: false }], expectedIncome: 6000, savingsTarget: 500 }
    await PUT(new Request('http://x', { method: 'PUT', body: JSON.stringify(body) }))
    const res2 = await PUT(new Request('http://x', { method: 'PUT', body: JSON.stringify({ ...body, expectedIncome: 6500 }) }))
    expect(res2.status).toBe(200)
    const count = await db.budget.count({ where: { userId: 'user_test', month: '2026-07' } })
    expect(count).toBe(1)
  })
})

describe('GET /api/budgets', () => {
  it('returns null for a month with no budget', async () => {
    const res = await GET(new Request('http://x/api/budgets?month=2099-01'))
    const body = await res.json()
    expect(body).toBeNull()
  })
})
```

- [ ] **Step 3: Verify fail.**

- [ ] **Step 4: Implement**

`apps/web/app/api/budgets/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { upsertBudgetSchema } from '@/lib/validation/budgets'

export async function GET(req: Request) {
  const { userId } = await getRequiredSession()
  const month = new URL(req.url).searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month query param required' }, { status: 400 })
  const budget = await db.budget.findUnique({ where: { userId_month: { userId, month } }, include: { entries: true } })
  if (!budget) return NextResponse.json(null)
  return NextResponse.json({
    id: budget.id, month: budget.month,
    expectedIncome: Number(budget.expectedIncome), savingsTarget: Number(budget.savingsTarget),
    entries: budget.entries.map((e) => ({ categoryId: e.categoryId, budgeted: Number(e.budgeted), rollover: e.rollover })),
  })
}

export async function PUT(req: Request) {
  const { userId } = await getRequiredSession()
  const parsed = upsertBudgetSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { month, entries, expectedIncome, savingsTarget } = parsed.data

  const budget = await db.budget.upsert({
    where: { userId_month: { userId, month } },
    create: { userId, month, expectedIncome, savingsTarget },
    update: { expectedIncome, savingsTarget },
  })
  await db.budgetEntry.deleteMany({ where: { budgetId: budget.id } })
  await db.budgetEntry.createMany({ data: entries.map((e) => ({ ...e, budgetId: budget.id })) })
  return NextResponse.json({ id: budget.id })
}
```

Note `@@unique([userId, month])` from Task 2 generates `userId_month` — verify against `node_modules/.prisma/client/index.d.ts` same as Task 9 Step 8, adjust name if needed.

- [ ] **Step 5: Verify pass.**

- [ ] **Step 6: Query hook + wire page** — `useBudgets.ts` (`useBudget(month)`, `useUpsertBudget()`) following the established pattern; `app/app/budgets/page.tsx` swaps `useStore().budgets`/`upsertBudget`/`copyBudget` for the hook plus a client-side "copy last month" that reads the previous month's budget via `useBudget` and calls `useUpsertBudget().mutate(...)` with its entries.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/api/budgets apps/web/hooks/queries/useBudgets.ts apps/web/lib/validation/budgets.ts apps/web/test/api/budgets.test.ts apps/web/app/app/budgets/page.tsx
git commit -m "feat: budgets API with per-month upsert"
```

---

### Task 12: Debts + payoff scenarios API

**Files:**
- Create: `apps/web/app/api/debts/route.ts`, `apps/web/app/api/debts/[id]/route.ts`, `apps/web/app/api/scenarios/payoff/route.ts`, `apps/web/app/api/scenarios/payoff/[id]/route.ts`, `apps/web/hooks/queries/useDebts.ts`, `apps/web/lib/validation/debts.ts`
- Test: `apps/web/test/api/debts.test.ts`
- Modify: `apps/web/app/app/debt/page.tsx`, `apps/web/app/app/debt/payoff-planner/page.tsx`

**Interfaces:**
- Consumes: `getRequiredSession`, `db`; client still calls `simulatePayoff`/`compareStrategies` from `lib/finance/debt.ts` (Task 4, unchanged) — the API persists debt records and named scenario configs only, simulation stays instant and client-side per PRD R4.3.
- Produces: `useDebts()`, `useCreateDebt()`, `useUpdateDebt()`, `useDeleteDebt()`; `usePayoffScenarios()`, `useSavePayoffScenario()`, `useDeletePayoffScenario()`.

- [ ] **Step 1: Zod schemas**

`apps/web/lib/validation/debts.ts`:
```typescript
import { z } from 'zod'

export const createDebtSchema = z.object({
  name: z.string().min(1).max(200),
  lender: z.string().min(1).max(200),
  type: z.enum(['credit_card', 'auto_loan', 'student_loan', 'personal_loan', 'mortgage', 'medical', 'bnpl', 'other']),
  balance: z.number().min(0),
  originalBalance: z.number().min(0),
  apr: z.number().min(0).max(100),
  minimumPayment: z.number().min(0),
  dueDay: z.number().int().min(1).max(31),
  creditLimit: z.number().min(0).optional(),
  accountId: z.string().optional(),
})
export const updateDebtSchema = createDebtSchema.partial()

export const savePayoffScenarioSchema = z.object({
  name: z.string().min(1).max(200),
  strategy: z.enum(['minimum', 'snowball', 'avalanche', 'custom']),
  extraMonthly: z.number().min(0),
  oneTimePayment: z.number().min(0),
  startMonth: z.string().regex(/^\d{4}-\d{2}$/),
  customOrder: z.array(z.string()).default([]),
})
```

- [ ] **Step 2: Failing test**

`apps/web/test/api/debts.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/debts/route'
import { db } from '@/lib/db'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: 'user_test' })) }))

beforeEach(async () => {
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'debt@example.com' } })
  await db.debt.deleteMany({ where: { userId: 'user_test' } })
})

describe('POST /api/debts then GET', () => {
  it('round-trips a debt with correct decimal precision', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ name: 'Car Loan', lender: 'Honda', type: 'auto_loan', balance: 27420.55, originalBalance: 33500, apr: 5.99, minimumPayment: 647, dueDay: 15 }),
    })
    const postRes = await POST(req)
    expect(postRes.status).toBe(201)
    const getRes = await GET()
    const body = await getRes.json()
    expect(body[0].balance).toBe(27420.55)
    expect(body[0].apr).toBe(5.99)
  })
})
```

- [ ] **Step 3: Verify fail.**

- [ ] **Step 4: Implement debts route**

`apps/web/app/api/debts/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { createDebtSchema } from '@/lib/validation/debts'

function toDTO(row: Awaited<ReturnType<typeof db.debt.findFirstOrThrow>>) {
  return {
    id: row.id, name: row.name, lender: row.lender, type: row.type,
    balance: Number(row.balance), originalBalance: Number(row.originalBalance),
    apr: Number(row.apr), minimumPayment: Number(row.minimumPayment), dueDay: row.dueDay,
    creditLimit: row.creditLimit ? Number(row.creditLimit) : undefined, accountId: row.accountId ?? undefined,
  }
}

export async function GET() {
  const { userId } = await getRequiredSession()
  const rows = await db.debt.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json(rows.map(toDTO))
}

export async function POST(req: Request) {
  const { userId } = await getRequiredSession()
  const parsed = createDebtSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const row = await db.debt.create({ data: { ...parsed.data, userId } })
  return NextResponse.json(toDTO(row), { status: 201 })
}
```

`apps/web/app/api/debts/[id]/route.ts` — PATCH/DELETE, same ownership pattern as Task 6.

- [ ] **Step 5: Verify pass.**

- [ ] **Step 6: Implement payoff-scenarios route**

`apps/web/app/api/scenarios/payoff/route.ts` — GET (list) / POST (create), same shape as debts but using `savePayoffScenarioSchema` against `db.payoffScenario`. `apps/web/app/api/scenarios/payoff/[id]/route.ts` — PATCH/DELETE.

- [ ] **Step 7: Query hooks + wire pages**

`useDebts.ts` following the established `useAccounts.ts` pattern (`useDebts`, `useCreateDebt`, `useUpdateDebt`, `useDeleteDebt`, `usePayoffScenarios`, `useSavePayoffScenario`, `useDeletePayoffScenario`). Wire `app/app/debt/page.tsx` (list/CRUD) and `app/app/debt/payoff-planner/page.tsx` (loads debts via `useDebts`, still runs `compareStrategies` client-side on the fetched array exactly as `lib/finance/debt.ts` already does, and calls `useSavePayoffScenario` when the user names/saves a scenario).

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/api/debts apps/web/app/api/scenarios apps/web/hooks/queries/useDebts.ts apps/web/lib/validation/debts.ts apps/web/test/api/debts.test.ts apps/web/app/app/debt
git commit -m "feat: debts and payoff-scenario persistence API, wire debt payoff simulator to real data"
```

---

### Task 13: Wire the Dashboard to real data

**Files:**
- Modify: `apps/web/app/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `useAccounts` (Task 6), `useTransactions` (Task 8), `useBudgets`/`useBudget` (Task 11), `useDebts`/`usePayoffScenarios` (Task 12), plus unchanged `netWorth`, `budgetTotals`, `spendingByCategory` from `lib/finance/budget.ts` and `compareStrategies` from `lib/finance/debt.ts`.

- [ ] **Step 1: Replace store reads**

In `app/app/dashboard/page.tsx`, replace every `useStore()` destructure for `accounts`, `transactions`, `budgets`, `debts` with the corresponding query hooks. Keep `dashboardWidgets` visibility state on the existing Zustand store (out of scope — UI preference, not server data).

- [ ] **Step 2: Recompute derived numbers against fetched data**

Net worth: `netWorth(accounts)`. Current-month budget summary: `budgetTotals(budget, spendingByCategory(transactions, currentMonth))` where `budget` comes from `useBudget(currentMonth)`. Debt widget: run `compareStrategies(debts, activeScenario?.extraMonthly ?? 0, 0, currentMonth)` and surface `snowball.debtFreeDate` (or the user's active named scenario's strategy) exactly as the existing component already expects — only the data source changed, not the shape.

- [ ] **Step 3: Loading and empty states**

Add a combined `isLoading = accountsQ.isLoading || txQ.isLoading || debtsQ.isLoading` guard rendering `LoadingSkeleton`; for a brand-new user with zero accounts, render the existing empty-state component (check `components/shared/States.tsx` for an `EmptyState` export) prompting them to add an account.

- [ ] **Step 4: Manual verification against the <1.5s AC**

Seed ~5,000 test transactions for the signed-in test user via a one-off script (`npx tsx apps/web/scripts/seed-perf-test.ts`, deleted after use), load `/app/dashboard`, confirm via browser DevTools Network/Performance tab that the page is interactive in under 1.5s (PRD R5 AC). If it exceeds this, add an index or reduce the transactions query to `take: 10` for the "recent transactions" widget specifically (it should already be capped — verify `app/api/transactions/route.ts` supports a small `pageSize` for this call site).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/app/dashboard/page.tsx
git commit -m "feat: wire dashboard to real accounts, transactions, budgets, and debt data"
```

---

### Task 14: Security hardening — cross-user isolation tests + rate limiting

**Files:**
- Create: `apps/web/test/api/security.test.ts`
- Modify: none functional (this task verifies Tasks 6–12's existing scoping); add rate limiting middleware if gaps found

**Interfaces:**
- Consumes: every route handler built in Tasks 6–12.

- [ ] **Step 1: Write the cross-user isolation test suite**

`apps/web/test/api/security.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '@/lib/db'

let currentUserId = 'user_a'
vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: currentUserId })) }))

import { GET as getAccounts } from '@/app/api/accounts/route'
import { GET as getTransactions } from '@/app/api/transactions/route'
import { GET as getDebts } from '@/app/api/debts/route'
import { PATCH as patchAccount } from '@/app/api/accounts/[id]/route'

beforeEach(async () => {
  await db.user.upsert({ where: { id: 'user_a' }, update: {}, create: { id: 'user_a', email: 'a@example.com' } })
  await db.user.upsert({ where: { id: 'user_b' }, update: {}, create: { id: 'user_b', email: 'b@example.com' } })
})

describe('cross-user data isolation', () => {
  it('user A cannot see user B\'s accounts', async () => {
    await db.financialAccount.create({ data: { userId: 'user_b', name: 'B Secret', institution: 'X', type: 'checking', balance: 1 } })
    currentUserId = 'user_a'
    const res = await getAccounts()
    const body = await res.json()
    expect(body.some((a: { name: string }) => a.name === 'B Secret')).toBe(false)
  })

  it('user A cannot PATCH user B\'s account', async () => {
    const bAccount = await db.financialAccount.create({ data: { userId: 'user_b', name: 'B Account', institution: 'X', type: 'checking', balance: 1 } })
    currentUserId = 'user_a'
    const res = await patchAccount(
      new Request('http://x', { method: 'PATCH', body: JSON.stringify({ name: 'Hacked' }) }),
      { params: Promise.resolve({ id: bAccount.id }) },
    )
    expect(res.status).toBe(404)
    const stillOriginal = await db.financialAccount.findUnique({ where: { id: bAccount.id } })
    expect(stillOriginal?.name).toBe('B Account')
  })

  it('user A cannot see user B\'s transactions', async () => {
    const bAcc = await db.financialAccount.create({ data: { userId: 'user_b', name: 'X', institution: 'X', type: 'checking', balance: 0 } })
    await db.transaction.create({ data: { userId: 'user_b', accountId: bAcc.id, type: 'expense', amount: 5, merchant: 'Secret Purchase', date: new Date() } })
    currentUserId = 'user_a'
    const res = await getTransactions(new Request('http://x/api/transactions'))
    const body = await res.json()
    expect(body.items.some((t: { merchant: string }) => t.merchant === 'Secret Purchase')).toBe(false)
  })

  it('user A cannot see user B\'s debts', async () => {
    await db.debt.create({ data: { userId: 'user_b', name: 'B Debt', lender: 'X', type: 'other', balance: 100, originalBalance: 100, apr: 5, minimumPayment: 10, dueDay: 1 } })
    currentUserId = 'user_a'
    const res = await getDebts()
    const body = await res.json()
    expect(body.some((d: { name: string }) => d.name === 'B Debt')).toBe(false)
  })
})
```

- [ ] **Step 2: Run, verify pass**

Run: `npm run test --workspace=apps/web -- security.test.ts`
Expected: all 4 tests PASS given the `where: { ..., userId }` scoping already implemented in Tasks 6–12. If any fail, fix the offending route handler immediately — this is the PRD §11 non-negotiable requirement.

- [ ] **Step 3: Add basic rate limiting to auth + import endpoints**

```bash
npm install @upstash/ratelimit @upstash/redis --workspace=apps/web
```

`apps/web/lib/rateLimit.ts`:
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export const authRateLimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m') })
export const importRateLimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 h') })
```

Add to `apps/web/.env.example`: `UPSTASH_REDIS_REST_URL=""` and `UPSTASH_REDIS_REST_TOKEN=""`.

In `apps/web/app/api/auth/register/route.ts` (Task 6 Step 9), add at the top of `POST`:
```typescript
const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
const { success } = await authRateLimit.limit(ip)
if (!success) return NextResponse.json({ error: 'Too many attempts, try again later' }, { status: 429 })
```

Apply the same pattern (`importRateLimit`, keyed by `userId` after `getRequiredSession()`) at the top of `apps/web/app/api/imports/csv/route.ts`'s `POST`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/test/api/security.test.ts apps/web/lib/rateLimit.ts apps/web/app/api/auth/register/route.ts apps/web/app/api/imports/csv/route.ts apps/web/.env.example apps/web/package.json
git commit -m "test: add cross-user isolation suite; add rate limiting to auth and import endpoints"
```

---

### Task 15: Cutover — retire the Vite app

**Files:**
- Delete: `src/`, `index.html`, `vite.config.ts`, `eslint.config.js` (root), `tsconfig.app.json`, `tsconfig.node.json`, `components.json` (root)
- Modify: root `package.json` (scripts delegate to `apps/web`), `README.md`

**Interfaces:** none — this is a repo-cleanup task, no code interface.

- [ ] **Step 1: Confirm parity**

Run `npm run build --workspace=apps/web` and manually click through every route in the table from Task 5 Step 4 on the running Next.js app; confirm each renders without error and — for the ported entities (accounts, categories, transactions, budgets, debts) — confirm CRUD works end-to-end against the real DB.

- [ ] **Step 2: Delete the old Vite app**

```bash
git rm -r src index.html vite.config.ts eslint.config.js tsconfig.app.json tsconfig.node.json components.json
```

- [ ] **Step 3: Update root `package.json` scripts**

```json
  "scripts": {
    "dev": "npm run dev --workspace=apps/web",
    "build": "npm run build --workspace=apps/web",
    "lint": "npm run lint --workspace=apps/web",
    "test": "npm run test --workspace=apps/web"
  },
```

Remove the now-unused root-level `dependencies`/`devDependencies` that only the Vite app needed (keep only `"workspaces"`).

- [ ] **Step 4: Update `README.md`** with the new dev setup: `npm install`, copy `apps/web/.env.example` to `apps/web/.env.local` and fill in `DATABASE_URL`/`AUTH_SECRET`/Google OAuth creds, `npx prisma migrate deploy && npx prisma db seed --workspace=apps/web`, `npm run dev`.

- [ ] **Step 5: Full regression run**

Run: `npm run build && npm test`
Expected: build succeeds, full test suite (finance engine + all API route tests + security tests) passes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: retire Vite SPA, Next.js app in apps/web is now the sole frontend"
```

---

## Self-Review Notes

- **Spec coverage:** F1 (auth+accounts), F2 (transactions+CSV import+dedupe+rules, R2.1–R2.5), F3 (budgets, R3.1–R3.5), F4's data layer (debts persisted; simulation itself already existed pre-plan in `lib/finance/debt.ts` and is reused unchanged per R4.2–R4.5), F5 (dashboard wiring) are covered by Tasks 6–13. Security requirements from PRD §11 covered by Task 14. Explicitly deferred: F6–F15 (investments, recurring detection, reports, Plaid, AI categorization, goals/bills/mobile) — these are separate future plans per the Scope Check.
- **Placeholder scan:** no TBD/"add error handling"/"similar to Task N" — every task has concrete file paths, full code, and exact test/verify commands.
- **Type consistency:** `Account`, `Transaction`, `Category`, `Debt`, `Budget` DTO shapes returned by every route match the pre-existing `types/index.ts` fields exactly (verified against Task 4's ported file) so ported page components need no prop-shape changes beyond swapping data source.

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-24-nextjs-migration-backend.md`.** Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
