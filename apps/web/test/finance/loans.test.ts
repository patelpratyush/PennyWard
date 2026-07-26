import { describe, it, expect } from 'vitest'
import { monthlyPayment, buildAmortization, calculateLoan } from '@/lib/finance/loans'

describe('monthlyPayment', () => {
  it('matches standard amortization formula for a 5-year auto loan', () => {
    // $25,000 @ 6% APR, 60 months — verified against Bankrate calculator
    expect(monthlyPayment(25000, 6, 60)).toBeCloseTo(483.32, 1)
  })

  it('handles 0% APR as a straight division', () => {
    expect(monthlyPayment(12000, 0, 12)).toBe(1000)
  })
})

describe('buildAmortization', () => {
  it('final row ends at exactly zero balance', () => {
    const schedule = buildAmortization({
      principal: 10000, apr: 5, termMonths: 24, startDate: '2026-01-01',
    })
    expect(schedule.at(-1)?.endingBalance).toBe(0)
    expect(schedule).toHaveLength(24)
  })

  it('extra monthly payments shorten the schedule', () => {
    const base = buildAmortization({ principal: 10000, apr: 5, termMonths: 24, startDate: '2026-01-01' })
    const accel = buildAmortization({ principal: 10000, apr: 5, termMonths: 24, startDate: '2026-01-01', extraMonthly: 200 })
    expect(accel.length).toBeLessThan(base.length)
  })
})

describe('calculateLoan', () => {
  it('reports zero interestSaved when no extra payment given', () => {
    const result = calculateLoan({ principal: 5000, apr: 4, termMonths: 12, startDate: '2026-01-01' })
    expect(result.interestSaved).toBe(0)
  })
})
