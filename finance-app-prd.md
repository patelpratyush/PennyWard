# PRD: FinFlow — Personal Finance & Debt Payoff Platform

*(Working name — rename freely. Alternatives: Ledgerly, Centable, PayoffPilot)*

**Author:** Pratyush Patel
**Version:** 1.0 — July 2026
**Status:** Draft → Build
**Platforms:** Web first (responsive), then mobile (React Native/Expo)

---

## 1. Overview

### 1.1 Problem Statement

People juggle 4–8 financial accounts (checking, savings, credit cards, car loan, student loans, brokerage) across different apps and portals. They don't have a single answer to three questions:

1. **Where is my money going?** (spending + budgets)
2. **What am I worth right now?** (net worth = assets − liabilities)
3. **When will I be debt-free, and what's the fastest way to get there?** (payoff planning)

Monarch ($14.99/mo) and Rocket Money ($6–12/mo) solve this but are paid, closed, and bloated. FinFlow is the focused, fast, free-to-self-host version with a best-in-class **debt payoff simulator** as the hero feature.

### 1.2 Product Vision

> "Mint's tracking + Monarch's debt payoff clarity + a real amortization engine, in one clean app you actually understand."

### 1.3 Goals

| Goal | Metric |
|---|---|
| Ship usable MVP | Deployed, self-usable within 6–8 weeks of part-time work |
| Hero feature quality | Debt simulator handles multi-loan snowball/avalanche with extra payments, interactive in <100ms |
| Portfolio/resume value | 3+ strong XYZ-formula resume bullets (full-stack, data modeling, AI categorization) |
| Real usage | You + 5–10 friends using it weekly by Phase 3 |

### 1.4 Non-Goals (explicitly out of scope)

- Subscription **cancellation** service (Rocket Money's human-ops feature) — we only *detect* recurring charges
- Bill negotiation
- Direct money movement / payments (no ACH origination — massive compliance burden)
- Tax prep
- Crypto wallets (can add read-only prices later)
- Credit score monitoring (needs bureau partnerships)

---

## 2. Users & Personas

**P1 — "Debt-focused Dana" (primary, matches Monarch's ad targeting)**
26, has a $28k car loan at 7.1% APR and 2 credit cards. Wants to know: *"If I throw an extra $200/month at this, when am I done and how much interest do I save?"* Wants a visceral, visual answer.

**P2 — "Budget-curious Ben"**
Salaried, spends without tracking, wants monthly category budgets and a "safe to spend" number. Imports CSVs from Chase/Amex monthly.

**P3 — "Investor Pratyush" (you)**
Tracks a brokerage portfolio, wants net worth trending over time, live quotes, allocation breakdown, and everything in one dashboard.

---

## 3. Competitive Snapshot

| | Monarch | Rocket Money | YNAB | **FinFlow** |
|---|---|---|---|---|
| Price | $14.99/mo | $6–12/mo | $14.99/mo | Free / self-host |
| Bank sync | Plaid/MX/Finicity | Plaid | Plaid | Plaid (Phase 3), CSV first |
| Debt payoff simulator | Basic | Basic | No | **Hero feature: multi-debt, snowball/avalanche, sliders, scenarios** |
| Investments | Yes | Basic | No | Yes (quotes + allocation) |
| AI categorization | Rules-based | Rules-based | Manual | **LLM/embedding-based** |
| Open/ownable | No | No | No | Yes |

**Positioning:** FinFlow doesn't out-feature Monarch; it out-executes on the debt payoff experience and stays free.

---
## 4. Feature Requirements

Features are grouped by phase. Each has requirements (R#) and acceptance criteria (AC).

---

### PHASE 1 — MVP: Manual Money Core (Weeks 1–4)

*No bank connections. Everything works with manual entry + CSV import. This alone is demoable and self-usable.*

#### F1. Authentication & Accounts

- **R1.1** Email/password + Google OAuth sign-in (NextAuth.js / Auth.js)
- **R1.2** User can create financial accounts of types: `checking`, `savings`, `credit_card`, `loan`, `investment`, `cash`, `other`
- **R1.3** Each account: name, type, institution (free text), current balance, currency (USD only for MVP)
- **AC:** New user can sign up, create 3 accounts, see them on dashboard in <2 minutes.

#### F2. Transactions

- **R2.1** Manual add/edit/delete transaction: date, amount (negative = expense, positive = income), payee, category, account, notes
- **R2.2** **CSV import**: upload bank export → column-mapping UI (map "Description" → payee, etc.) → preview → import. Save mapping per institution so re-imports are one click.
- **R2.3** Dedupe on import: hash of (account_id, date, amount, normalized payee); flag suspected duplicates instead of silently importing
- **R2.4** Transaction list: paginated, filterable (date range, category, account, search payee), sortable
- **R2.5** Rule-based auto-categorization v1: user-defined rules ("payee contains STARBUCKS → Coffee") applied on import
- **AC:** Import a 500-row Chase CSV in <10s with correct mapping, <2% needing manual re-categorization after rules are set.

#### F3. Categories & Budgets

- **R3.1** Default category tree (Groceries, Dining, Transport, Rent, Subscriptions, Income:Salary, etc.), user can add/rename/archive; 2 levels max (Group → Category)
- **R3.2** Monthly budget per category; unbudgeted categories roll into "Everything else"
- **R3.3** Budget view: for current month show budgeted / spent / remaining with progress bars; over-budget in red
- **R3.4** "Left to spend" headline number = total budgeted income − total spent this month
- **R3.5** Copy last month's budget as starting point
- **AC:** Set 10 category budgets, import transactions, budget bars reflect spend accurately including refunds (positive amounts reduce category spend).

#### F4. Debt Payoff Simulator ⭐ (HERO FEATURE)

- **R4.1** Add debt: name, type (auto loan, credit card, student loan, mortgage, personal), current balance, APR, minimum payment, payment day. Optionally derive from a `loan`/`credit_card` account.
- **R4.2** **Amortization engine** (see §7.3 for math): monthly schedule per debt — payment #, date, payment amount, interest portion, principal portion, remaining balance; totals for interest paid and payoff date
- **R4.3** **Extra payment slider** ($0–$1000, plus manual input): schedule, payoff date, and total interest update live (<100ms, computed client-side)
- **R4.4** **Comparison card**: "Extra $200/mo → debt-free **Mar 2028 instead of Nov 2029** — save **$2,340** in interest" — the Monarch-ad moment
- **R4.5** **Multi-debt strategies**: with N debts + one monthly extra amount, simulate **Snowball** (smallest balance first) vs **Avalanche** (highest APR first) vs minimums-only; show side-by-side payoff dates and total interest
- **R4.6** Visuals: stacked area chart of balances over time; timeline with per-debt payoff milestone markers
- **R4.7** One-time lump sum payment scenario ("what if I put my $3k bonus on the car loan in December?")
- **R4.8** Shareable scenario: save named scenarios ("Aggressive plan", "Comfortable plan") and compare
- **AC:** 3 debts, $300 extra → snowball vs avalanche results match a spreadsheet check to the penny; slider updates feel instant.

#### F5. Dashboard

- **R5.1** Net worth headline (sum of asset balances − sum of liability balances) + 30/90-day sparkline (from balance snapshots)
- **R5.2** This month: spending vs budget summary, top 5 categories donut
- **R5.3** Debt progress widget: total debt, next payoff milestone, "debt-free by" date from active scenario
- **R5.4** Recent transactions (last 10)
- **AC:** Dashboard loads in <1.5s with 5k transactions.

---

### PHASE 2 — Investments & Insights (Weeks 5–7)

#### F6. Portfolio Tracking

- **R6.1** Add holdings to an investment account: ticker, shares, cost basis (manual entry or CSV)
- **R6.2** Live/delayed quotes via **Finnhub free tier** (60 calls/min) with server-side caching (15-min TTL); yfinance acceptable for local dev only
- **R6.3** Portfolio view: total value, day change, total gain/loss ($ and %), per-holding table
- **R6.4** Allocation donut (by holding; by sector if API provides)
- **R6.5** Watchlist: tickers with price, day change, 52-week range
- **R6.6** Simple quote page per ticker: price chart (1D/1M/6M/1Y), key stats
- **AC:** 10-holding portfolio shows correct total value vs brokerage within quote-delay tolerance; page loads without hitting rate limits (cache works).

#### F7. Recurring Detection & Subscriptions

- **R7.1** Detect recurring transactions: same normalized payee, similar amount (±15%), regular cadence (weekly/monthly/annual ±4 days), ≥2 occurrences
- **R7.2** Subscriptions view: merchant, amount, cadence, next expected date, annual cost; total "you spend $X/yr on subscriptions"
- **R7.3** Flag price increases ("Netflix went from $15.49 → $17.99")
- **R7.4** Upcoming bills widget on dashboard (next 14 days of expected recurrings)
- **AC:** On your real data, ≥90% of true subscriptions detected, <3 false positives.

#### F8. Reports & Trends

- **R8.1** Spending over time: monthly bar chart by category (stacked), 12-month view
- **R8.2** Income vs expenses monthly ("savings rate")
- **R8.3** Category deep-dive: trend line + transaction list for one category
- **R8.4** Net worth history chart (daily balance snapshots via nightly job)
- **AC:** All reports filterable by date range and account; render <1s at 10k transactions.

---

### PHASE 3 — Bank Sync & AI (Weeks 8–12)

#### F9. Plaid Integration

- **R9.1** Plaid Link flow to connect institutions (start in Sandbox; Production has a free tier — ~100–200 connections)
- **R9.2** `/transactions/sync` cursor-based incremental sync (webhook-triggered + manual refresh button); handle added/modified/removed
- **R9.3** Balances refresh on sync; account auto-created and mapped to FinFlow account types
- **R9.4** Merge strategy: synced transactions coexist with manual/CSV ones; dedupe against prior CSV imports
- **R9.5** Handle `ITEM_LOGIN_REQUIRED` (re-auth) gracefully with a "fix connection" banner
- **AC:** Connect Plaid Sandbox institution, transactions appear within 30s of webhook, no duplicates after CSV overlap.

#### F10. AI Transaction Categorization ⭐ (resume feature #2)

- **R10.1** Pipeline: user rules (highest priority) → exact payee memory (user corrected it before) → **AI classifier** → "Uncategorized"
- **R10.2** AI classifier v1: normalize payee string → embed (OpenAI `text-embedding-3-small` or local model) → nearest-neighbor against labeled examples (pgvector) → category if similarity > threshold, else LLM fallback (Claude Haiku with the category list, batched, structured JSON output)
- **R10.3** Every user correction is stored as a labeled example → system improves per-user over time
- **R10.4** Confidence shown subtly; low-confidence transactions land in a "Review" queue
- **R10.5** Cost control: batch LLM calls per import, cache by normalized payee globally per user
- **AC:** ≥85% top-1 accuracy on your held-out real transactions; LLM cost < $0.01 per 500-transaction import.

#### F11. Goals

- **R11.1** Savings goals: name, target amount, target date, linked account; progress bar + required monthly contribution
- **R11.2** Debt-free goal auto-created from active payoff scenario
- **AC:** Goal math correct across month boundaries.

---

### PHASE 4 — Mobile & Polish (Weeks 13+)

- **F12** React Native (Expo) app consuming the same API: dashboard, transactions (add + review queue), budgets, debt simulator (read + slider), push notification for "bill due"/"over budget" (Expo Notifications)
- **F13** Email digest: weekly summary (Resend + React Email)
- **F14** Data export (full CSV/JSON dump), account deletion (real deletion — required for trust)
- **F15** Dark mode, keyboard shortcuts, onboarding checklist

---

## 5. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js 15 (App Router) + TypeScript** | SSR dashboard, one deploy, huge ecosystem; you know React |
| UI | Tailwind CSS + **shadcn/ui** | Fast, professional look without design time |
| Charts | **Recharts** (or Tremor for dashboard blocks) | Area/stacked charts for payoff + spending |
| State/data | TanStack Query + Zod | Server-state caching, typed API contracts |
| Backend | **Next.js API routes / server actions** for MVP; extract a **FastAPI** service later if AI/data jobs grow | One codebase to start; FastAPI plays to your Python strength for the AI pipeline |
| ORM | **Prisma** (TS) — or Drizzle if you want SQL closer to the metal | Migrations, type safety |
| Database | **PostgreSQL** (Neon or Supabase) + **pgvector** ext | Relational fits ledgers; pgvector for AI categorization |
| Auth | Auth.js (NextAuth) — email + Google | Standard |
| Jobs/cron | Vercel Cron (nightly snapshots) → upgrade to Inngest/queue when Plaid webhooks arrive | Simple first |
| Bank data | **Plaid** (Sandbox → Production free tier) | Industry standard |
| Quotes | **Finnhub** free tier (server-cached) | 60 req/min free, real API key experience |
| AI | OpenAI embeddings + Claude Haiku fallback (or all-local: `bge-small` + Ollama) | Cheap, accurate |
| Hosting | Vercel (app) + Neon (DB) | Free tiers cover everything pre-Plaid-production |
| Mobile | Expo (React Native) | Reuse API + TS types |

**Monorepo layout (Turborepo optional):**

```
finflow/
├── apps/
│   ├── web/            # Next.js
│   └── mobile/         # Expo (Phase 4)
├── packages/
│   ├── db/             # Prisma schema + client
│   ├── core/           # ⭐ pure TS domain logic: amortization, strategies,
│   │                   #   recurring detection, budget math (fully unit-tested,
│   │                   #   shared by web + mobile)
│   └── ui/             # shared components (later)
└── services/
    └── categorizer/    # FastAPI AI service (Phase 3, optional split)
```

> The `core` package is the secret weapon: pure functions, 100% test coverage, no framework deps. It's what makes the simulator instant (runs client-side) and correct (unit tests vs spreadsheet fixtures).

---

## 6. Data Model (PostgreSQL)

```sql
-- Users handled by Auth.js tables (users, accounts, sessions)

CREATE TABLE financial_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN
                  ('checking','savings','credit_card','loan','investment','cash','other')),
  institution   TEXT,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_liability  BOOLEAN GENERATED ALWAYS AS (type IN ('credit_card','loan')) STORED,
  plaid_item_id TEXT,            -- Phase 3
  plaid_account_id TEXT,         -- Phase 3
  created_at    TIMESTAMPTZ DEFAULT now(),
  archived_at   TIMESTAMPTZ
);

CREATE TABLE categories (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL = system default
  parent_id UUID REFERENCES categories(id),
  name      TEXT NOT NULL,
  kind      TEXT NOT NULL DEFAULT 'expense' CHECK (kind IN ('expense','income','transfer')),
  archived_at TIMESTAMPTZ
);

CREATE TABLE transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id   UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
  category_id  UUID REFERENCES categories(id),
  posted_at    DATE NOT NULL,
  amount       NUMERIC(14,2) NOT NULL,      -- negative = outflow (store money as NUMERIC, never float)
  payee_raw    TEXT NOT NULL,               -- as imported
  payee        TEXT NOT NULL,               -- normalized/cleaned
  notes        TEXT,
  source       TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','csv','plaid')),
  import_hash  TEXT,                        -- dedupe: sha256(account|date|amount|payee_norm)
  plaid_txn_id TEXT UNIQUE,
  categorized_by TEXT CHECK (categorized_by IN ('user','rule','memory','ai','none')),
  ai_confidence  REAL,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_txn_user_date ON transactions(user_id, posted_at DESC);
CREATE INDEX idx_txn_account   ON transactions(account_id, posted_at DESC);
CREATE UNIQUE INDEX idx_txn_dedupe ON transactions(user_id, import_hash)
  WHERE import_hash IS NOT NULL;

CREATE TABLE budgets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  month       DATE NOT NULL,               -- first of month
  amount      NUMERIC(12,2) NOT NULL,
  UNIQUE (user_id, category_id, month)
);

CREATE TABLE debts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id     UUID REFERENCES financial_accounts(id),
  name           TEXT NOT NULL,
  debt_type      TEXT NOT NULL CHECK (debt_type IN
                   ('auto','credit_card','student','mortgage','personal')),
  principal      NUMERIC(14,2) NOT NULL,   -- current balance
  apr            NUMERIC(6,4)  NOT NULL,   -- 0.0710 = 7.10%
  min_payment    NUMERIC(12,2) NOT NULL,
  payment_day    SMALLINT DEFAULT 1,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payoff_scenarios (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  strategy     TEXT NOT NULL CHECK (strategy IN ('snowball','avalanche','custom','minimums')),
  extra_monthly NUMERIC(12,2) NOT NULL DEFAULT 0,
  lump_sums    JSONB DEFAULT '[]',         -- [{date, amount, debt_id|null}]
  is_active    BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);
-- schedules are computed on the fly in packages/core, not stored

CREATE TABLE holdings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
  ticker     TEXT NOT NULL,
  shares     NUMERIC(16,6) NOT NULL,
  cost_basis NUMERIC(14,2)
);

CREATE TABLE balance_snapshots (        -- nightly cron; powers net worth chart
  account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
  as_of      DATE NOT NULL,
  balance    NUMERIC(14,2) NOT NULL,
  PRIMARY KEY (account_id, as_of)
);

CREATE TABLE categorization_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_type  TEXT NOT NULL CHECK (match_type IN ('contains','equals','regex')),
  pattern     TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id),
  priority    INT NOT NULL DEFAULT 0
);

CREATE TABLE payee_labels (             -- AI training memory (Phase 3, pgvector)
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payee_norm  TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id),
  embedding   vector(1536),
  UNIQUE (user_id, payee_norm)
);

CREATE TABLE recurring_series (         -- Phase 2, detected
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payee_norm  TEXT NOT NULL,
  cadence     TEXT NOT NULL CHECK (cadence IN ('weekly','biweekly','monthly','annual')),
  avg_amount  NUMERIC(12,2) NOT NULL,
  next_expected DATE,
  is_confirmed  BOOLEAN DEFAULT false,   -- user can confirm/dismiss
  dismissed_at  TIMESTAMPTZ
);
```

**Data rules that will save you pain:**
- Money is always `NUMERIC`, never `float`. In TS use integer cents or `decimal.js` in `core`.
- Transactions are the source of truth for *spend*; `current_balance` is the source of truth for *balance* (they won't always reconcile with partial history — that's fine, Monarch does the same).
- Everything is scoped by `user_id`; enforce in every query (or Postgres RLS if on Supabase).

---

## 7. Core Algorithms (packages/core)

### 7.1 Money handling
All engine math in integer **cents** (or decimal.js). Round half-up at each payment step, matching lender behavior.

### 7.2 Payee normalization
```
"SQ *BLUE BOTTLE COF 4155551234 CA" → "blue bottle cof"
```
Uppercase→lower, strip `SQ *`, `TST*`, `PAYPAL *` prefixes, phone numbers, store numbers, state suffixes, collapse whitespace. This one function drives dedupe, rules, recurring detection, and AI accuracy — unit test it heavily.

### 7.3 Single-debt amortization

Monthly rate `r = APR / 12`. For payment `P` on balance `B`:

```
interest_m  = round(B_m × r)
principal_m = P − interest_m
B_{m+1}     = B_m − principal_m
```

- Final payment = remaining balance + its interest (don't overpay).
- If `P ≤ interest_m` → payment never amortizes: surface a "minimum too low — balance grows" warning instead of looping forever.
- **Closed-form payoff months** (for instant slider label): `n = −log(1 − rB/P) / log(1+r)`; still generate the schedule iteratively for the table/chart.
- Fixed-term loan payment (car loan calculator mode — user enters amount/APR/months, we compute payment):
  `P = B · r / (1 − (1+r)^−n)`

### 7.4 Multi-debt strategy simulation

```
monthly_pool = Σ min_payments + extra_monthly
each month:
  1. accrue interest on every open debt
  2. pay each open debt its min_payment (cap at payoff)
  3. leftover = pool − Σ paid  → send ALL of it to the target debt:
       snowball  = open debt with smallest balance
       avalanche = open debt with highest APR
  4. when a debt closes mid-plan, its min payment stays in the pool (the "snowball" effect)
  5. apply any lump sums scheduled this month
stop when all balances = 0; record per-debt payoff dates + total interest
```
Return: `{schedule[], perDebt[], totalInterest, debtFreeDate}` for each strategy → diff them for the comparison card.

### 7.5 Recurring detection (Phase 2)
Group by `payee_norm` → for groups with ≥2 txns, compute gaps between dates → cadence if median gap ∈ {7±2, 14±3, 30±4, 365±10} days and amount variance ≤15% → predict `next_expected = last_date + median_gap`.

### 7.6 AI categorization (Phase 3)
```
rules → payee_labels exact match → pgvector kNN (cosine > 0.85) → LLM batch fallback → review queue
```
LLM prompt: category list + 20 payees per call, temperature 0, JSON out. Every user correction upserts `payee_labels` with a fresh embedding.

---

## 8. API Surface (REST-ish, all under /api)

```
POST   /auth/*                          (Auth.js)
GET    /accounts                        list
POST   /accounts                        create
PATCH  /accounts/:id
GET    /transactions?from&to&category&account&q&page
POST   /transactions
PATCH  /transactions/:id                (edit incl. category → writes payee_labels)
POST   /imports/csv                     upload + mapping → { imported, duplicates, review[] }
GET    /budgets?month=2026-07
PUT    /budgets                         upsert [{categoryId, month, amount}]
GET    /debts
POST   /debts
POST   /simulate                        { debts?, extra, strategy, lumpSums } → schedules
                                        (also runs client-side from core; endpoint exists for mobile/share)
GET    /scenarios | POST /scenarios | PATCH /scenarios/:id
GET    /portfolio                       holdings + cached quotes
GET    /quotes/:ticker?range=1M
GET    /recurring
GET    /reports/spending?granularity=month
GET    /networth/history
POST   /plaid/link-token                (Phase 3)
POST   /plaid/exchange
POST   /webhooks/plaid
```

---

## 9. Key Screens

1. **Onboarding** — sign up → add first account → add a debt OR import CSV → land on dashboard with real numbers (aha in <5 min)
2. **Dashboard** — net worth + sparkline, budget summary, debt-free-by widget, upcoming bills, recent txns
3. **Transactions** — table, filters, inline category edit, Review queue tab, Import button
4. **Budgets** — month picker, category rows with progress bars, "copy last month"
5. **Debt Payoff** ⭐ — debts list; big slider for extra payment; strategy toggle (snowball/avalanche/minimums); comparison card ("save $X, done Y months earlier"); stacked area chart; amortization table (expandable per debt); save scenario
6. **Loan Calculator** (public page, no login — SEO/demo bait) — amount/APR/term → payment + full schedule + extra-payment slider; CTA to sign up to save it
7. **Investments** — portfolio table, allocation donut, watchlist, ticker detail
8. **Recurring** — subscription list with annual total + price-hike flags
9. **Reports** — spending trends, income vs expense, category deep-dive
10. **Settings** — categories, rules, connections, export, delete account

---

## 10. Milestone Plan (part-time, ~8–10 hrs/wk)

| Week | Deliverable | Definition of done |
|---|---|---|
| 1 | Repo, Next.js + Prisma + Auth, schema migrated, account CRUD | Sign in, create accounts, deployed to Vercel |
| 2 | **`core` amortization + strategy engine, fully unit-tested** | Vitest suite passes vs Excel fixtures; closed-form ≈ iterative |
| 3 | Debt Payoff UI: slider, comparison card, chart, table + public loan calculator page | Demo-able hero feature 🎉 |
| 4 | Transactions CRUD + CSV import w/ mapping + dedupe + rules; budgets | Import your own real bank CSVs |
| 5 | Dashboard + nightly balance snapshots + net worth chart | Daily-driver usable |
| 6 | Portfolio + Finnhub quotes w/ caching; watchlist | |
| 7 | Recurring detection + subscriptions view + reports | **Phase 2 complete — polish, README, screenshots, add to portfolio site** |
| 8–9 | Plaid Sandbox: Link, sync, webhooks, dedupe vs CSV | |
| 10–11 | AI categorization pipeline + review queue | Accuracy eval on your labeled data |
| 12 | Goals, email digest, hardening | Invite 5 friends |
| 13+ | Expo mobile app | |

**Rule: weeks 2–3 come before everything else.** If you only ever finish the debt simulator + public loan calculator, you still have a great portfolio piece.

---

## 11. Security & Privacy (non-negotiable for a finance app)

- HTTPS only; secure/httpOnly session cookies; CSRF via Auth.js defaults
- Every DB query filtered by `user_id` (add integration tests that assert cross-user access fails)
- Plaid access tokens encrypted at rest (AES-256-GCM, key in env/KMS) — never sent to client
- No secrets in the repo; `.env` + Vercel env vars
- Rate limiting on auth + import endpoints (Upstash ratelimit)
- Zod validation on every API input
- Full data export + true account deletion
- Plain-English privacy note in the footer ("your data is yours; we never sell it")

## 12. Testing Strategy

- **`core` package: 90%+ coverage.** Fixture tests: build 3 loan scenarios in Excel/Sheets, export expected schedules as JSON, assert to the penny
- Edge cases: 0% APR, payment ≤ interest, 1-month loan, lump sum > balance, leap years, payment day 31
- CSV import: golden-file tests with real (sanitized) Chase/Amex/Discover exports
- Playwright smoke: signup → add debt → slider → comparison card renders
- AI categorization: hold out 200 labeled real transactions, track accuracy per release

## 13. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Scope creep (this doc is big) | Phase gates; weeks 2–3 hero-first rule |
| Plaid production access friction | Everything works on CSV import; Plaid is additive |
| Quote API rate limits | Server cache 15-min TTL; one fetch per ticker per window |
| Float money bugs | Integer cents in core; NUMERIC in Postgres; lint rule banning `number` math on money types |
| AI cost | Embeddings-first, LLM only as fallback, cache by payee |
| Burnout | Ship the public loan calculator by week 3 = early win + something to share |

## 14. Success Criteria for v1.0

- You use it weekly instead of a spreadsheet
- Debt simulator results verified against 3 independent calculators
- 5+ external users, at least one connected via Plaid
- Portfolio site case study with GIF of the slider updating the payoff date live
- 3 resume bullets, e.g.:
  - *"Built a multi-debt payoff simulation engine (snowball/avalanche) in TypeScript computing 30-year amortization schedules in <100ms client-side, verified to the penny against fixture data with 95% test coverage."*
  - *"Designed a hybrid AI transaction-categorization pipeline (rules → pgvector kNN → batched LLM fallback) achieving 85%+ accuracy at <$0.01 per 500 transactions."*
  - *"Integrated Plaid transaction sync with cursor-based webhooks and hash-based deduplication across CSV and API sources for a PostgreSQL double-entry-style ledger."*

---

## 15. Backlog / v2 Ideas (do NOT build now)

Shared/household budgets · refinance comparison tool · credit-card payoff vs balance-transfer analyzer · cash-flow forecasting · Zillow/vehicle asset values · crypto read-only · CSV auto-detection of bank formats via LLM · public API · self-host Docker image
