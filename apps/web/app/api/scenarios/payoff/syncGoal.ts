import { db } from '@/lib/db'
import { round2 } from '@/lib/format'
import { simulatePayoff, type LumpSum } from '@pennyward/core'

/**
 * R11.2: saving/updating a payoff scenario auto-creates/updates a linked
 * "debt-free" Goal (target = current total debt, targetDate = the
 * scenario's projected payoff date). Skipped for the no-extra-payment
 * 'minimum' strategy — there's no accelerated payoff date to track.
 */
export async function syncDebtFreeGoal(
  userId: string, scenarioId: string, scenarioName: string,
  extraMonthly: number, oneTimePayment: number, startMonth: string,
  strategy: string, customOrder: string[], lumpSums: LumpSum[] = [],
) {
  if (strategy === 'minimum') return
  const debts = await db.debt.findMany({ where: { userId } })
  if (debts.length === 0) return

  const totalDebt = round2(debts.reduce((s, d) => s + Number(d.balance), 0))
  const result = simulatePayoff({
    debts: debts.map((d) => ({
      id: d.id, name: d.name, balance: Number(d.balance), apr: Number(d.apr), minimumPayment: Number(d.minimumPayment),
    })),
    strategy: strategy as 'snowball' | 'avalanche' | 'custom',
    extraMonthly, oneTimePayment, startMonth, customOrder, lumpSums,
  })

  await db.goal.upsert({
    where: { scenarioId },
    create: {
      userId, scenarioId, name: `Debt-free: ${scenarioName}`, type: 'custom',
      targetAmount: totalDebt, currentAmount: 0, targetDate: new Date(result.debtFreeDate),
      monthlyContribution: extraMonthly,
    },
    update: {
      name: `Debt-free: ${scenarioName}`, targetAmount: totalDebt,
      targetDate: new Date(result.debtFreeDate), monthlyContribution: extraMonthly,
    },
  })
}
