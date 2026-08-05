import type { Plan } from '@prisma/client'

/**
 * What each tier actually gates, matching the pricing page's comparison
 * table (app/(marketing)/pricing/page.tsx) — with two honest exceptions:
 *
 * - "Basic vs Advanced" for budgets was never a real code distinction
 *   before this file existed, and inventing one here would just be making
 *   up product behavior. Not represented below. (Loan calculator's split
 *   IS real now — see `maxLoanScenarios` — and Reports now has a real,
 *   if client-only, split — see `advancedReports`.)
 * - "Shared household dashboard" / "Multiple members & permissions" need a
 *   membership+invite model that doesn't exist. `household` currently gets
 *   the same limits as `pro`; it is not yet functionally different.
 *
 * `csvImport`, `goals`, and the numeric caps (except `maxWatchlists`) are
 * enforced server-side, in the route handlers that own those resources.
 * `maxWatchlists` has no backend at all (still Zustand/localStorage) —
 * gating it is client-side UI only, not a security boundary, since there's
 * no server resource to guard.
 */
export const PLAN_LIMITS: Record<Plan, {
  maxDebtPayoffScenarios: number
  maxBudgetMonths: number
  /** Number of watchlists (containers), not tickers within one. */
  maxWatchlists: number
  /** Saved loan-calculator scenarios (car + general), server-persisted and capped. */
  maxLoanScenarios: number
  csvImport: boolean
  dataExport: boolean
  /** All-or-nothing (not a count) — enforced server-side in POST /api/goals. */
  goals: boolean
  /**
   * Reports page: on Free, only Spending + Cash Flow render (the other 6
   * report types show locked), and the date range clamps to a trailing
   * 3-month window. Client-only — see the file-level doc comment above.
   */
  advancedReports: boolean
  /**
   * Dashboard "Financial insights" card (rule-based, derived from data the
   * user already sees elsewhere). Was rendered unconditionally to everyone
   * despite the pricing page claiming it's Pro-only. Client-only gate, same
   * footing as `maxWatchlists`.
   */
  insights: boolean
}> = {
  free: {
    maxDebtPayoffScenarios: 1,
    maxBudgetMonths: 1,
    maxWatchlists: 1,
    maxLoanScenarios: 1,
    csvImport: false,
    dataExport: false,
    goals: false,
    advancedReports: false,
    insights: false,
  },
  pro: {
    maxDebtPayoffScenarios: Infinity,
    maxBudgetMonths: Infinity,
    maxWatchlists: Infinity,
    maxLoanScenarios: Infinity,
    csvImport: true,
    dataExport: true,
    goals: true,
    advancedReports: true,
    insights: true,
  },
  household: {
    maxDebtPayoffScenarios: Infinity,
    maxBudgetMonths: Infinity,
    maxWatchlists: Infinity,
    maxLoanScenarios: Infinity,
    csvImport: true,
    dataExport: true,
    goals: true,
    advancedReports: true,
    insights: true,
  },
}

/** Standard shape for a blocked-by-plan response, parsed by the client hooks. */
export function upgradeRequired(message: string) {
  return { error: 'upgrade_required' as const, message }
}
