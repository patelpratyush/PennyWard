// ─── Debt payoff strategies: minimum-only, snowball, avalanche, custom ───────
import { addMonths, format, parseISO } from 'date-fns'
import { round2 } from '../format'
import type { Debt, DebtPayoffResult, PayoffStrategy } from '@/types'

interface SimDebt {
  id: string
  name: string
  balance: number
  apr: number
  minimumPayment: number
}

export interface PayoffInputs {
  debts: Debt[]
  strategy: PayoffStrategy
  extraMonthly: number
  oneTimePayment: number
  startMonth: string // 'YYYY-MM'
  customOrder?: string[]
  maxMonths?: number
}

function orderDebts(debts: SimDebt[], strategy: PayoffStrategy, customOrder?: string[]): SimDebt[] {
  const arr = [...debts]
  if (strategy === 'snowball') arr.sort((a, b) => a.balance - b.balance)
  else if (strategy === 'avalanche') arr.sort((a, b) => b.apr - a.apr)
  else if (strategy === 'custom' && customOrder?.length) {
    arr.sort((a, b) => {
      const ia = customOrder.indexOf(a.id)
      const ib = customOrder.indexOf(b.id)
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    })
  }
  return arr
}

export function simulatePayoff(inputs: PayoffInputs): DebtPayoffResult {
  const { strategy, extraMonthly, oneTimePayment, startMonth, customOrder, maxMonths = 600 } = inputs
  let pool: SimDebt[] = inputs.debts.map((d) => ({
    id: d.id, name: d.name, balance: round2(d.balance), apr: d.apr, minimumPayment: round2(d.minimumPayment),
  }))

  const payoffOrder: { debtId: string; name: string; month: string }[] = []
  const timeline: DebtPayoffResult['timeline'] = []
  let totalInterest = 0
  let totalPaid = 0
  let month = 0
  const start = parseISO(`${startMonth}-01`)

  while (pool.some((d) => d.balance > 0.004) && month < maxMonths) {
    month += 1
    const monthLabel = format(addMonths(start, month - 1), 'yyyy-MM')
    const active = pool.filter((d) => d.balance > 0.004)

    // Roll-up pool: freed minimum payments from completed debts
    const freedMinimums = pool
      .filter((d) => d.balance <= 0.004 && payoffOrder.some((p) => p.debtId === d.id))
      .reduce((s, d) => s + d.minimumPayment, 0)

    // Priority target: first active debt in strategy order
    const ordered = orderDebts(active, strategy, customOrder)
    const targetId = strategy === 'minimum' ? undefined : ordered[0]?.id

    let extraPool = strategy === 'minimum' ? 0 : round2(extraMonthly + freedMinimums + (month === 1 ? oneTimePayment : 0))
    const rows: DebtPayoffResult['timeline'][number]['rows'] = []

    for (const debt of active) {
      const interest = round2((debt.balance * debt.apr) / 100 / 12)
      const owed = round2(debt.balance + interest)
      let minimumPaid = Math.min(debt.minimumPayment, owed)
      let extraPaid = 0
      if (debt.id === targetId && extraPool > 0) {
        extraPaid = Math.min(extraPool, round2(owed - minimumPaid))
        extraPool = round2(extraPool - extraPaid)
      }
      let totalPayment = round2(minimumPaid + extraPaid)
      if (totalPayment > owed) {
        totalPayment = owed
        minimumPaid = round2(owed - extraPaid)
      }
      const ending = round2(owed - totalPayment)
      totalInterest = round2(totalInterest + interest)
      totalPaid = round2(totalPaid + totalPayment)
      rows.push({
        debtId: debt.id, debtName: debt.name, startingBalance: debt.balance,
        interest, minimumPaid, extraPaid, endingBalance: Math.max(0, ending),
      })
      debt.balance = Math.max(0, ending)
      if (debt.balance <= 0.004 && !payoffOrder.some((p) => p.debtId === debt.id)) {
        payoffOrder.push({ debtId: debt.id, name: debt.name, month: monthLabel })
      }
    }
    // If extra pool remains (target paid off mid-month), apply to next debt in order
    if (extraPool > 0.004 && strategy !== 'minimum') {
      for (const next of orderDebts(pool.filter((d) => d.balance > 0.004), strategy, customOrder)) {
        const apply = Math.min(extraPool, next.balance)
        next.balance = round2(next.balance - apply)
        extraPool = round2(extraPool - apply)
        totalPaid = round2(totalPaid + apply)
        const row = rows.find((r) => r.debtId === next.id)
        if (row) {
          row.extraPaid = round2(row.extraPaid + apply)
          row.endingBalance = next.balance
        }
        if (next.balance <= 0.004 && !payoffOrder.some((p) => p.debtId === next.id)) {
          payoffOrder.push({ debtId: next.id, name: next.name, month: monthLabel })
        }
        if (extraPool <= 0.004) break
      }
    }
    timeline.push({
      month: monthLabel,
      rows,
      totalBalance: round2(pool.reduce((s, d) => s + d.balance, 0)),
    })
  }

  const debtFreeDate = format(addMonths(start, Math.max(0, month - 1)), 'yyyy-MM-dd')
  return {
    strategy,
    months: month,
    debtFreeDate,
    totalInterest: round2(totalInterest),
    totalPaid: round2(totalPaid),
    payoffOrder,
    timeline,
    interestSaved: 0,
    monthsSaved: 0,
    firstDebtPaidOff: payoffOrder[0]?.name,
  }
}

/** Compare all strategies, computing savings vs. minimum-only baseline. */
export function compareStrategies(debts: Debt[], extraMonthly: number, oneTimePayment: number, startMonth: string, customOrder?: string[]) {
  const minimum = simulatePayoff({ debts, strategy: 'minimum', extraMonthly: 0, oneTimePayment: 0, startMonth })
  const snowball = simulatePayoff({ debts, strategy: 'snowball', extraMonthly, oneTimePayment, startMonth })
  const avalanche = simulatePayoff({ debts, strategy: 'avalanche', extraMonthly, oneTimePayment, startMonth })
  const custom = simulatePayoff({ debts, strategy: 'custom', extraMonthly, oneTimePayment, startMonth, customOrder })
  const baseline = minimum.totalInterest
  for (const r of [snowball, avalanche, custom]) {
    r.interestSaved = round2(Math.max(0, baseline - r.totalInterest))
    r.monthsSaved = Math.max(0, minimum.months - r.months)
  }
  return { minimum, snowball, avalanche, custom }
}
