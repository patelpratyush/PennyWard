import { describe, it, expect } from 'vitest'
import { closedFormPayoffMonths, monthlyPayment } from '../src/loans'

describe('closedFormPayoffMonths (§7.3)', () => {
  it('matches a straight division at 0% APR', () => {
    expect(closedFormPayoffMonths(1200, 0, 100)).toBe(12)
  })

  it('reconstructs the original term for a standard amortizing payment (round-trips against monthlyPayment)', () => {
    const payment = monthlyPayment(1000, 12, 24) // a real 24-month, 12% APR loan's payment
    const months = closedFormPayoffMonths(1000, 12, payment)
    expect(months).not.toBeNull()
    expect(months!).toBeCloseTo(24, 1) // closed form recovers ~24 months from that payment
  })

  it('returns null when the payment never covers the accruing interest', () => {
    // $10,000 @ 24% APR (2%/mo) accrues $200/mo interest — a $150 payment can never amortize it.
    expect(closedFormPayoffMonths(10000, 24, 150)).toBeNull()
  })

  it('returns 0 for an already-paid-off balance', () => {
    expect(closedFormPayoffMonths(0, 12, 100)).toBe(0)
  })
})
