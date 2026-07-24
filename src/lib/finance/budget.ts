// ─── Budget, net-worth, and goal calculations ────────────────────────────────
import { differenceInCalendarMonths, parseISO } from 'date-fns'
import { round2 } from '../format'
import type { Account, Budget, Goal, Transaction } from '@/types'

export type BudgetStatus = 'on_track' | 'near_limit' | 'over_budget' | 'no_activity'

export function spendingByCategory(transactions: Transaction[], month?: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'expense') continue // transfers excluded
    if (month && !t.date.startsWith(month)) continue
    if (t.splits?.length) {
      for (const s of t.splits) map.set(s.categoryId, round2((map.get(s.categoryId) ?? 0) + s.amount))
    } else if (t.categoryId) {
      map.set(t.categoryId, round2((map.get(t.categoryId) ?? 0) + t.amount))
    }
  }
  return map
}

export function budgetStatus(budgeted: number, spent: number): BudgetStatus {
  if (spent === 0) return 'no_activity'
  if (budgeted <= 0) return spent > 0 ? 'over_budget' : 'no_activity'
  const pct = (spent / budgeted) * 100
  if (pct > 100) return 'over_budget'
  if (pct >= 85) return 'near_limit'
  return 'on_track'
}

export function budgetTotals(budget: Budget, spent: Map<string, number>) {
  const totalBudgeted = round2(budget.entries.reduce((s, e) => s + e.budgeted, 0))
  const totalSpent = round2(budget.entries.reduce((s, e) => s + (spent.get(e.categoryId) ?? 0), 0))
  const remaining = round2(totalBudgeted - totalSpent)
  const leftToAssign = round2(budget.expectedIncome - totalBudgeted - budget.savingsTarget)
  const pctUsed = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0
  return { totalBudgeted, totalSpent, remaining, leftToAssign, pctUsed }
}

export function netWorth(accounts: Account[]) {
  const included = accounts.filter((a) => a.includeInNetWorth && !a.archived)
  const assets = round2(included.filter((a) => a.balance >= 0).reduce((s, a) => s + a.balance, 0))
  const liabilities = round2(included.filter((a) => a.balance < 0).reduce((s, a) => s + Math.abs(a.balance), 0))
  return { assets, liabilities, netWorth: round2(assets - liabilities) }
}

export interface GoalMath {
  remaining: number
  pct: number
  requiredMonthly: number
  estimatedCompletion: string | null
  onTrack: boolean
}

export function goalMath(goal: Goal, fromDate = new Date()): GoalMath {
  const remaining = round2(Math.max(0, goal.targetAmount - goal.currentAmount))
  const pct = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0
  const monthsLeft = Math.max(1, differenceInCalendarMonths(parseISO(goal.targetDate), fromDate))
  const requiredMonthly = round2(remaining / monthsLeft)
  let estimatedCompletion: string | null = null
  if (remaining <= 0) estimatedCompletion = goal.targetDate
  else if (goal.monthlyContribution > 0) {
    const monthsNeeded = Math.ceil(remaining / goal.monthlyContribution)
    const d = new Date(fromDate)
    d.setMonth(d.getMonth() + monthsNeeded)
    estimatedCompletion = d.toISOString().slice(0, 10)
  }
  const onTrack = remaining <= 0 ? true : goal.monthlyContribution >= requiredMonthly * 0.95
  return { remaining, pct, requiredMonthly, estimatedCompletion, onTrack }
}
