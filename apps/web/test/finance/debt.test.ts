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
