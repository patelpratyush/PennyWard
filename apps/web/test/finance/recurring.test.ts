import { describe, it, expect } from 'vitest'
import { detectRecurring } from '@/lib/finance/recurring'
import type { Transaction } from '@/types'

let idCounter = 0
function tx(overrides: Partial<Transaction> & { date: string; amount: number; merchant: string }): Transaction {
  idCounter++
  return {
    id: `t${idCounter}`, accountId: 'acc_1', type: 'expense', tags: [], recurring: false, cleared: true,
    createdAt: `${overrides.date}T00:00:00.000Z`,
    ...overrides,
  }
}

describe('detectRecurring', () => {
  it('ignores a payee seen only once', () => {
    const result = detectRecurring([tx({ date: '2026-01-01', amount: 15.99, merchant: 'Netflix' })])
    expect(result).toHaveLength(0)
  })

  it('classifies a monthly subscription (30-day gaps) and predicts the next date', () => {
    const txns = [
      tx({ date: '2026-01-05', amount: 15.99, merchant: 'Netflix' }),
      tx({ date: '2026-02-04', amount: 15.99, merchant: 'Netflix' }),
      tx({ date: '2026-03-06', amount: 15.99, merchant: 'Netflix' }),
    ]
    const [series] = detectRecurring(txns)
    expect(series.cadence).toBe('monthly')
    expect(series.avgAmount).toBe(15.99)
    expect(series.occurrences).toBe(3)
    expect(series.nextExpected).toBe('2026-04-05')
  })

  it('classifies weekly cadence (7-day gaps)', () => {
    const txns = [
      tx({ date: '2026-01-01', amount: 12, merchant: 'Coffee Shop' }),
      tx({ date: '2026-01-08', amount: 12, merchant: 'Coffee Shop' }),
      tx({ date: '2026-01-15', amount: 12, merchant: 'Coffee Shop' }),
    ]
    expect(detectRecurring(txns)[0].cadence).toBe('weekly')
  })

  it('rejects a gap just outside the weekly/biweekly bands (10 days — the gap between them)', () => {
    const txns = [
      tx({ date: '2026-01-01', amount: 12, merchant: 'Odd Gap Co' }),
      tx({ date: '2026-01-11', amount: 12, merchant: 'Odd Gap Co' }),
      tx({ date: '2026-01-21', amount: 12, merchant: 'Odd Gap Co' }),
    ]
    expect(detectRecurring(txns)).toHaveLength(0)
  })

  it('accepts the exact edge of the biweekly band (11-day gap)', () => {
    const txns = [
      tx({ date: '2026-01-01', amount: 40, merchant: 'Edge Gym' }),
      tx({ date: '2026-01-12', amount: 40, merchant: 'Edge Gym' }),
      tx({ date: '2026-01-23', amount: 40, merchant: 'Edge Gym' }),
    ]
    expect(detectRecurring(txns)[0].cadence).toBe('biweekly')
  })

  it('classifies annual cadence (365-day gap)', () => {
    const txns = [
      tx({ date: '2025-01-01', amount: 120, merchant: 'Amazon Prime' }),
      tx({ date: '2026-01-01', amount: 120, merchant: 'Amazon Prime' }),
    ]
    expect(detectRecurring(txns)[0].cadence).toBe('annual')
  })

  it('rejects amount variance over 15%', () => {
    const txns = [
      tx({ date: '2026-01-05', amount: 10, merchant: 'Erratic Biller' }),
      tx({ date: '2026-02-05', amount: 15, merchant: 'Erratic Biller' }),
      tx({ date: '2026-03-05', amount: 10, merchant: 'Erratic Biller' }),
    ]
    expect(detectRecurring(txns)).toHaveLength(0)
  })

  it('accepts amount variance right at the 15% boundary', () => {
    const txns = [
      tx({ date: '2026-01-05', amount: 100, merchant: 'Boundary Co' }),
      tx({ date: '2026-02-04', amount: 115, merchant: 'Boundary Co' }),
      tx({ date: '2026-03-06', amount: 100, merchant: 'Boundary Co' }),
    ]
    expect(detectRecurring(txns)[0].cadence).toBe('monthly')
  })

  it('flags a price increase between the last two occurrences', () => {
    const txns = [
      tx({ date: '2026-01-05', amount: 15.49, merchant: 'Netflix' }),
      tx({ date: '2026-02-05', amount: 15.49, merchant: 'Netflix' }),
      tx({ date: '2026-03-05', amount: 17.99, merchant: 'Netflix' }),
    ]
    const [series] = detectRecurring(txns)
    expect(series.priceIncreased).toBe(true)
    expect(series.previousAmount).toBe(15.49)
    expect(series.lastAmount).toBe(17.99)
  })

  it('does not flag a price increase for a stable series', () => {
    const txns = [
      tx({ date: '2026-01-05', amount: 15.99, merchant: 'Netflix' }),
      tx({ date: '2026-02-05', amount: 15.99, merchant: 'Netflix' }),
    ]
    expect(detectRecurring(txns)[0].priceIncreased).toBe(false)
  })

  it('excludes transfers from detection', () => {
    const txns = [
      tx({ date: '2026-01-05', amount: 500, merchant: 'Savings Transfer', type: 'transfer' }),
      tx({ date: '2026-02-05', amount: 500, merchant: 'Savings Transfer', type: 'transfer' }),
    ]
    expect(detectRecurring(txns)).toHaveLength(0)
  })

  it('groups payees using the same normalization as CSV import (case/prefix/number noise)', () => {
    const txns = [
      tx({ date: '2026-01-05', amount: 9.99, merchant: 'SQ *BLUE BOTTLE COF 4155551234 CA' }),
      tx({ date: '2026-02-05', amount: 9.99, merchant: 'Blue Bottle Cof' }),
      tx({ date: '2026-03-05', amount: 9.99, merchant: 'blue bottle cof' }),
    ]
    expect(detectRecurring(txns)).toHaveLength(1)
  })
})
