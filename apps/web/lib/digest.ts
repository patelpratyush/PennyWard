import { addDays, subDays } from 'date-fns'
import { db } from './db'
import { round2 } from './format'
import { detectRecurring } from '@pennyward/core'

export interface WeeklyDigestData {
  userName: string | null
  weekIncome: number
  weekExpenses: number
  weekNet: number
  topCategories: { name: string; amount: number }[]
  netWorth: number
  upcomingBills: { merchant: string; amount: number; nextExpected: string }[]
  debtFreeDate: string | null
}

/** Gathers one user's weekly digest from real data — no derived state is
 * persisted anywhere; this recomputes fresh every send, same "stateless
 * derivation" philosophy as Reports and Recurring detection. */
export async function buildWeeklyDigest(userId: string): Promise<WeeklyDigestData> {
  const since = subDays(new Date(), 7)

  const [user, weekTransactions, allTransactions, accounts, debtFreeGoal] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
    db.transaction.findMany({
      where: { userId, date: { gte: since } },
      select: { type: true, amount: true, categoryId: true },
    }),
    db.transaction.findMany({
      where: { userId },
      select: { type: true, merchant: true, date: true, amount: true },
    }),
    db.financialAccount.findMany({
      where: { userId, archived: false, includeInNetWorth: true },
      select: { balance: true },
    }),
    db.goal.findFirst({
      where: { userId, scenarioId: { not: null } },
      orderBy: { targetDate: 'asc' },
      select: { targetDate: true },
    }),
  ])

  const weekIncome = round2(weekTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0))
  const weekExpenses = round2(weekTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0))

  const byCategory = new Map<string, number>()
  for (const t of weekTransactions) {
    if (t.type !== 'expense' || !t.categoryId) continue
    byCategory.set(t.categoryId, round2((byCategory.get(t.categoryId) ?? 0) + Number(t.amount)))
  }
  const categoryIds = [...byCategory.keys()]
  const categories = categoryIds.length
    ? await db.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } })
    : []
  const categoryName = new Map(categories.map((c) => [c.id, c.name]))
  const topCategories = [...byCategory.entries()]
    .map(([id, amount]) => ({ name: categoryName.get(id) ?? 'Other', amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)

  const netWorth = round2(accounts.reduce((s, a) => s + Number(a.balance), 0))

  const series = detectRecurring(
    allTransactions.map((t) => ({ type: t.type, merchant: t.merchant, date: t.date.toISOString().slice(0, 10), amount: round2(Number(t.amount)) })),
  )
  const twoWeeksOut = addDays(new Date(), 14).toISOString().slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  const upcomingBills = series
    .filter((s) => s.type === 'expense' && s.nextExpected >= today && s.nextExpected <= twoWeeksOut)
    .sort((a, b) => a.nextExpected.localeCompare(b.nextExpected))
    .slice(0, 5)
    .map((s) => ({ merchant: s.displayName, amount: s.avgAmount, nextExpected: s.nextExpected }))

  return {
    userName: user.name,
    weekIncome, weekExpenses, weekNet: round2(weekIncome - weekExpenses),
    topCategories, netWorth, upcomingBills,
    debtFreeDate: debtFreeGoal ? debtFreeGoal.targetDate.toISOString().slice(0, 10) : null,
  }
}
