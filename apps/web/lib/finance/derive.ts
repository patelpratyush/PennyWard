// ─── Dashboard & report derivations from raw entities ────────────────────────
import { format, subMonths } from 'date-fns'
import { round2 } from '../format'
import type { Transaction } from '@/types'

export interface MonthSummary {
  month: string // 'YYYY-MM'
  label: string
  income: number
  expenses: number
  net: number
}

export function monthlySummaries(transactions: Transaction[], monthsBack = 6): MonthSummary[] {
  const result: MonthSummary[] = []
  const now = new Date()
  for (let m = monthsBack - 1; m >= 0; m--) {
    const d = subMonths(now, m)
    const key = format(d, 'yyyy-MM')
    let income = 0
    let expenses = 0
    for (const t of transactions) {
      if (!t.date.startsWith(key)) continue
      if (t.type === 'income') income += t.amount
      else if (t.type === 'expense') expenses += t.amount
    }
    result.push({
      month: key,
      label: format(d, 'MMM'),
      income: round2(income),
      expenses: round2(expenses),
      net: round2(income - expenses),
    })
  }
  return result
}

export function totalsForMonth(transactions: Transaction[], month: string) {
  let income = 0
  let expenses = 0
  let count = 0
  for (const t of transactions) {
    if (!t.date.startsWith(month)) continue
    count++
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expenses += t.amount
  }
  return { income: round2(income), expenses: round2(expenses), net: round2(income - expenses), count }
}

export function categoryTotals(transactions: Transaction[], month: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'expense' || !t.date.startsWith(month)) continue
    if (t.splits?.length) {
      for (const s of t.splits) map.set(s.categoryId, round2((map.get(s.categoryId) ?? 0) + s.amount))
    } else if (t.categoryId) {
      map.set(t.categoryId, round2((map.get(t.categoryId) ?? 0) + t.amount))
    }
  }
  return map
}

export function merchantTotals(transactions: Transaction[], month: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'expense' || !t.date.startsWith(month)) continue
    map.set(t.merchant, round2((map.get(t.merchant) ?? 0) + t.amount))
  }
  return map
}
