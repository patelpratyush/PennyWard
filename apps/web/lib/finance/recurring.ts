// ─── Recurring transaction detection ──────────────────────────────────────
// Groups transactions by normalized payee and classifies a cadence when the
// gaps between occurrences and their amounts are consistent enough to call
// it a subscription/recurring charge, rather than coincidental repeats.
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { normalizePayee } from '../payeeNormalize'
import { round2 } from '../format'

/** Only the fields detection actually needs — callable from either the
 * client Transaction type or a raw DB row, without fabricating unused fields. */
export interface RecurringInputTransaction {
  type: 'income' | 'expense' | 'transfer'
  merchant: string
  date: string
  amount: number
}

export type Cadence = 'weekly' | 'biweekly' | 'monthly' | 'annual'

// [min, max] day-gap tolerance per cadence, per the PRD's tolerance bands.
const CADENCE_BANDS: [Cadence, number, number][] = [
  ['weekly', 5, 9],
  ['biweekly', 11, 17],
  ['monthly', 26, 34],
  ['annual', 355, 375],
]

const MAX_AMOUNT_VARIANCE = 0.15

export interface RecurringSeries {
  payeeNorm: string
  displayName: string
  type: 'income' | 'expense'
  cadence: Cadence
  avgAmount: number
  lastAmount: number
  previousAmount: number | null
  priceIncreased: boolean
  lastDate: string
  nextExpected: string
  occurrences: number
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function detectRecurring(transactions: RecurringInputTransaction[]): RecurringSeries[] {
  const groups = new Map<string, RecurringInputTransaction[]>()
  for (const t of transactions) {
    if (t.type === 'transfer') continue
    const key = normalizePayee(t.merchant)
    if (!key) continue
    const bucket = groups.get(key) ?? []
    bucket.push(t)
    groups.set(key, bucket)
  }

  const series: RecurringSeries[] = []
  for (const [payeeNorm, txns] of groups) {
    if (txns.length < 2) continue
    const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date))

    const gaps = sorted.slice(1).map((t, i) => differenceInCalendarDays(parseISO(t.date), parseISO(sorted[i].date)))
    const medianGap = median(gaps)
    const cadence = CADENCE_BANDS.find(([, min, max]) => medianGap >= min && medianGap <= max)?.[0]
    if (!cadence) continue

    const amounts = sorted.map((t) => t.amount)
    const avgAmount = round2(amounts.reduce((s, a) => s + a, 0) / amounts.length)
    if (avgAmount === 0) continue
    const withinVariance = amounts.every((a) => Math.abs(a - avgAmount) / avgAmount <= MAX_AMOUNT_VARIANCE)
    if (!withinVariance) continue

    const last = sorted[sorted.length - 1]
    const previous = sorted.length >= 2 ? sorted[sorted.length - 2] : null
    const priceIncreased = previous != null && last.amount > previous.amount * 1.05

    const nextExpected = new Date(parseISO(last.date).getTime() + medianGap * 86400000).toISOString().slice(0, 10)

    series.push({
      payeeNorm,
      displayName: last.merchant,
      type: last.type === 'income' ? 'income' : 'expense',
      cadence,
      avgAmount,
      lastAmount: last.amount,
      previousAmount: previous?.amount ?? null,
      priceIncreased,
      lastDate: last.date,
      nextExpected,
      occurrences: sorted.length,
    })
  }

  return series.sort((a, b) => b.avgAmount - a.avgAmount)
}
