export type BudgetStatus = 'on_track' | 'near_limit' | 'over_budget' | 'no_activity'

export function budgetStatus(budgeted: number, spent: number): BudgetStatus {
  if (spent === 0) return 'no_activity'
  if (budgeted <= 0) return spent > 0 ? 'over_budget' : 'no_activity'
  const pct = (spent / budgeted) * 100
  if (pct > 100) return 'over_budget'
  if (pct >= 85) return 'near_limit'
  return 'on_track'
}
