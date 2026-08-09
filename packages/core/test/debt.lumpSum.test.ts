import { describe, it, expect } from 'vitest'
import { simulatePayoff } from '../src/debt'

describe('simulatePayoff — R4.7 scheduled, debt-targeted lump sums', () => {
  it('applies an untargeted single-debt lump sum at an arbitrary future month, hand-verified to the penny', () => {
    // 1 debt, 0% APR, $100 min payment, no extraMonthly, $400 lump sum in
    // month 3. Hand-computed schedule:
    //   m1: 1000 -100 = 900   m2: 900 -100 = 800
    //   m3: 800 -100 -400 = 300   m4: 300 -100 = 200
    //   m5: 200 -100 = 100   m6: 100 -100 = 0
    // 6 months, $0 interest, $1000 total paid, debt-free 2026-06-01.
    const result = simulatePayoff({
      debts: [{ id: 'd1', name: 'Card', balance: 1000, apr: 0, minimumPayment: 100 }],
      strategy: 'avalanche',
      extraMonthly: 0,
      oneTimePayment: 0,
      startMonth: '2026-01',
      lumpSums: [{ month: 3, amount: 400, debtId: 'd1' }],
    })
    expect(result.months).toBe(6)
    expect(result.totalInterest).toBe(0)
    expect(result.totalPaid).toBe(1000)
    expect(result.debtFreeDate).toBe('2026-06-01')
    expect(result.timeline[2].rows[0].extraPaid).toBe(400)
  })

  it('routes a debt-targeted lump sum to the named debt even when the strategy would target a different one', () => {
    // 2 debts, 0% APR. Snowball targets the smaller balance (B, $200) first.
    // A $300 lump sum explicitly targeted at A (the non-priority debt) must
    // still land on A, not get redirected to B by the snowball ordering.
    const result = simulatePayoff({
      debts: [
        { id: 'A', name: 'Big', balance: 1000, apr: 0, minimumPayment: 50 },
        { id: 'B', name: 'Small', balance: 200, apr: 0, minimumPayment: 50 },
      ],
      strategy: 'snowball',
      extraMonthly: 0,
      oneTimePayment: 0,
      startMonth: '2026-01',
      lumpSums: [{ month: 1, amount: 300, debtId: 'A' }],
    })
    const [rowA, rowB] = result.timeline[0].rows
    expect(rowA.debtId).toBe('A')
    expect(rowA.extraPaid).toBe(300)
    expect(rowA.endingBalance).toBe(650) // 1000 - 50 min - 300 lump
    expect(rowB.extraPaid).toBe(0)
    expect(rowB.endingBalance).toBe(150) // 200 - 50 min, no extra pool this month
  })

  it('routes an untargeted lump sum through the normal strategy priority, unchanged from before', () => {
    const result = simulatePayoff({
      debts: [
        { id: 'A', name: 'Big', balance: 1000, apr: 0, minimumPayment: 50 },
        { id: 'B', name: 'Small', balance: 200, apr: 0, minimumPayment: 50 },
      ],
      strategy: 'snowball',
      extraMonthly: 0,
      oneTimePayment: 0,
      startMonth: '2026-01',
      lumpSums: [{ month: 1, amount: 300 }],
    })
    const rowB = result.timeline[0].rows.find((r) => r.debtId === 'B')!
    // Snowball targets B (smaller balance) — untargeted lump sum goes there.
    expect(rowB.extraPaid).toBe(150) // capped: 200 owed - 50 min = 150 room
  })
})
