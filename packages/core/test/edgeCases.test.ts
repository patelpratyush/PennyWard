import { describe, it, expect } from 'vitest'
import { buildAmortization, calculateLoan } from '../src/loans'
import { simulatePayoff } from '../src/debt'

// PRD §12's exact edge-case list: 0% APR, payment ≤ interest, 1-month loan,
// lump sum > balance, leap years, payment day 31.

describe('edge case: 0% APR', () => {
  it('amortizes as a straight even split with zero interest', () => {
    const result = calculateLoan({ principal: 1200, apr: 0, termMonths: 12, startDate: '2026-01-01' })
    expect(result.totalInterest).toBe(0)
    expect(result.monthlyPayment).toBe(100)
    expect(result.months).toBe(12)
  })
})

describe('edge case: minimum payment ≤ interest accrued', () => {
  it('never amortizes — balance grows every month instead of shrinking, and the sim terminates at maxMonths instead of looping forever', () => {
    // $10,000 @ 24% APR (2%/mo → $200 interest/mo) with only a $150 minimum:
    // $50 of interest capitalizes onto the balance every month. This is the
    // "minimum too low" case the PRD flags — the engine must not hang.
    const result = simulatePayoff({
      debts: [{ id: 'd1', name: 'Card', balance: 10000, apr: 24, minimumPayment: 150 }],
      strategy: 'minimum',
      extraMonthly: 0,
      oneTimePayment: 0,
      startMonth: '2026-01',
      maxMonths: 600,
    })
    expect(result.months).toBe(600) // hit the cap, never reached zero
    expect(result.timeline.at(-1)!.totalBalance).toBeGreaterThan(10000) // balance grew, not shrank
  })
})

describe('edge case: 1-month loan', () => {
  it('pays off in a single payment covering principal + that month\'s interest exactly', () => {
    const result = calculateLoan({ principal: 1000, apr: 12, termMonths: 1, startDate: '2026-01-01' })
    expect(result.months).toBe(1)
    expect(result.totalInterest).toBe(10) // 1000 * 1%
    expect(result.totalPaid).toBe(1010)
    expect(result.schedule[0].endingBalance).toBe(0)
  })
})

describe('edge case: lump sum exceeding the remaining balance', () => {
  it('caps the applied amount at what\'s actually owed instead of overpaying', () => {
    const result = simulatePayoff({
      debts: [{ id: 'd1', name: 'Card', balance: 500, apr: 0, minimumPayment: 100 }],
      strategy: 'avalanche',
      extraMonthly: 0,
      oneTimePayment: 0,
      startMonth: '2026-01',
      lumpSums: [{ month: 1, amount: 1000, debtId: 'd1' }], // way more than the $500 owed
    })
    expect(result.months).toBe(1)
    expect(result.timeline[0].rows[0].extraPaid).toBe(400) // 500 owed - 100 min, not 1000
    expect(result.timeline[0].rows[0].endingBalance).toBe(0)
    expect(result.totalPaid).toBe(500) // never overpays past the actual balance
  })
})

describe('edge case: leap year', () => {
  it('a schedule starting in a leap February dates every payment correctly', () => {
    // 2028 is a leap year — Feb 29 exists. The engine steps by calendar
    // month (date-fns addMonths), not by day count, so leap years can't
    // desync the payment dates the way a naive +30-days loop would.
    const schedule = buildAmortization({ principal: 1200, apr: 0, termMonths: 4, startDate: '2028-02-29' })
    expect(schedule.map((r) => r.date)).toEqual(['2028-02-29', '2028-03-29', '2028-04-29', '2028-05-29'])
  })
})

describe('edge case: payment day 31 across variable-length months', () => {
  it('a schedule starting on the 31st clamps correctly in shorter months instead of producing an invalid date', () => {
    // Jan 31 -> Feb (28 days in 2026, not a leap year) -> Mar -> Apr (30 days).
    // date-fns addMonths clamps to the last valid day rather than overflowing.
    const schedule = buildAmortization({ principal: 1000, apr: 0, termMonths: 4, startDate: '2026-01-31' })
    expect(schedule.map((r) => r.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  })
})
