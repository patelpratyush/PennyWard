// ─── Backend integration seam ────────────────────────────────────────────────
// FinPilot currently persists to localStorage via the Zustand store in
// src/stores/useStore.ts. When the FastAPI backend is ready, replace the store
// actions' bodies with calls to these endpoints. PostgreSQL models will map
// 1:1 to the domain types in src/types/index.ts.
//
// Planned endpoints (FastAPI):
//   POST   /api/auth/sign-up        /api/auth/sign-in       /api/auth/reset
//   GET/POST/PATCH/DELETE /api/accounts[/:id]
//   GET/POST/PATCH/DELETE /api/transactions[/:id]   (bulk: /api/transactions/bulk)
//   POST   /api/transactions/import (CSV upload → mapping → confirm)
//   GET/PUT /api/budgets/:month
//   GET/POST/PATCH/DELETE /api/debts[/:id]          /api/payoff-plans
//   GET/POST /api/loans/scenarios                   /api/loans/amortization
//   GET/POST/PATCH/DELETE /api/goals[/:id]          /api/bills[/:id]
//   GET    /api/reports/:type?from=&to=
//   GET/POST /api/watchlists                        /api/notifications
//
// Plaid integration points (future, read-only connections):
//   POST /api/plaid/link-token   → open Plaid Link in src/features/accounts
//   POST /api/plaid/exchange     → swap public_token, store item in PostgreSQL
//   POST /api/plaid/sync         → pull accounts/transactions into the store
//
// Stock-data provider: replace src/services/stocks.ts with a client for
// GET /api/stocks/quote/:ticker and GET /api/stocks/history/:ticker?range=
// which proxy the chosen market-data vendor server-side.

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) throw new Error(`API request failed: ${res.status}`)
  return res.json() as Promise<T>
}
