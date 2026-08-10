// ─── Loan & amortization calculations ────────────────────────────────────────
// Decimal-safe logic: all money math rounds to cents at each step.
import { addMonths, format, parseISO } from 'date-fns'
import { round2 } from './money'
import type { AmortizationRow, LoanResult } from './types'

/** Standard monthly payment for an amortizing loan. Supports 0% APR. */
export function monthlyPayment(principal: number, apr: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0
  const r = apr / 100 / 12
  if (r === 0) return round2(principal / termMonths)
  const factor = Math.pow(1 + r, termMonths)
  return round2((principal * r * factor) / (factor - 1))
}

/**
 * PRD §7.3's closed-form payoff estimate: n = −log(1 − rB/P) / log(1+r).
 * Gives an instant months-to-payoff number for a UI label (e.g. a live
 * slider readout) without running the iterative schedule — the schedule
 * itself (buildAmortization) is still what drives the table/chart, since
 * this closed form can't account for a final partial payment or extra/
 * lump-sum payments mid-schedule.
 *
 * Returns `null` when the payment never amortizes the balance (P ≤ rB —
 * the "payment ≤ interest" edge case: the debt would grow forever).
 */
export function closedFormPayoffMonths(balance: number, apr: number, payment: number): number | null {
  if (balance <= 0) return 0
  if (payment <= 0) return null
  const r = apr / 100 / 12
  if (r === 0) return balance / payment
  if (payment <= r * balance) return null // never amortizes
  return -Math.log(1 - (r * balance) / payment) / Math.log(1 + r)
}

export interface AmortizationOptions {
  principal: number
  apr: number
  termMonths: number
  startDate: string // ISO — first payment date
  extraMonthly?: number
  oneTimePayment?: number
  oneTimePaymentMonth?: number // payment number at which one-time payment applies (default 1)
  maxMonths?: number
}

/** Build a full amortization schedule. Final payment is adjusted to avoid negative balance. */
export function buildAmortization(opts: AmortizationOptions): AmortizationRow[] {
  const {
    principal, apr, termMonths, startDate,
    extraMonthly = 0, oneTimePayment = 0, oneTimePaymentMonth = 1,
    maxMonths = 720,
  } = opts
  const r = apr / 100 / 12
  const scheduled = monthlyPayment(principal, apr, termMonths)
  if (scheduled <= 0 && extraMonthly <= 0 && oneTimePayment <= 0) return []

  const rows: AmortizationRow[] = []
  let balance = round2(principal)
  let cumPrincipal = 0
  let cumInterest = 0
  let n = 0
  const start = parseISO(startDate)

  while (balance > 0.004 && n < maxMonths) {
    n += 1
    const interest = round2(balance * r)
    let scheduledPayment = scheduled
    // Final scheduled payment should not overshoot balance + interest, and the
    // final term payment (when not extended by extra/lump payments) must fully
    // retire the balance rather than leaving a cent-level rounding residual.
    const isFinalScheduledTerm = n === termMonths && extraMonthly <= 0 && oneTimePayment <= 0
    if (scheduledPayment > balance + interest || isFinalScheduledTerm) scheduledPayment = round2(balance + interest)
    let principalPart = round2(scheduledPayment - interest)
    let extra = round2(extraMonthly + (n === oneTimePaymentMonth ? oneTimePayment : 0))
    if (principalPart + extra > balance) extra = round2(balance - principalPart)
    const totalPayment = round2(scheduledPayment + extra)
    const ending = round2(balance - principalPart - extra)
    cumPrincipal = round2(cumPrincipal + principalPart + extra)
    cumInterest = round2(cumInterest + interest)
    rows.push({
      paymentNumber: n,
      date: format(addMonths(start, n - 1), 'yyyy-MM-dd'),
      startingBalance: balance,
      scheduledPayment,
      extraPayment: extra,
      totalPayment,
      principal: round2(principalPart + extra),
      interest,
      endingBalance: Math.max(0, ending),
      cumulativePrincipal: cumPrincipal,
      cumulativeInterest: cumInterest,
    })
    balance = Math.max(0, ending)
    if (n >= termMonths && extraMonthly <= 0 && oneTimePayment <= 0) break
  }
  return rows
}

function summarize(schedule: AmortizationRow[], fallbackPayoff: string): LoanResult {
  const totalPaid = round2(schedule.reduce((s, r) => s + r.totalPayment, 0))
  const totalInterest = round2(schedule.reduce((s, r) => s + r.interest, 0))
  const last = schedule[schedule.length - 1]
  return {
    monthlyPayment: schedule[0]?.scheduledPayment ?? 0,
    totalInterest,
    totalPaid,
    payoffDate: last?.date ?? fallbackPayoff,
    months: schedule.length,
    schedule,
    interestSaved: 0,
    monthsSaved: 0,
  }
}

/** Full loan result, comparing standard schedule vs. accelerated (extra payments). */
export function calculateLoan(opts: AmortizationOptions): LoanResult {
  const base = buildAmortization({
    principal: opts.principal, apr: opts.apr, termMonths: opts.termMonths, startDate: opts.startDate,
  })
  const hasExtra = (opts.extraMonthly ?? 0) > 0 || (opts.oneTimePayment ?? 0) > 0
  if (!hasExtra) return summarize(base, opts.startDate)
  const accel = buildAmortization(opts)
  const baseSum = summarize(base, opts.startDate)
  const accelSum = summarize(accel, opts.startDate)
  accelSum.interestSaved = round2(Math.max(0, baseSum.totalInterest - accelSum.totalInterest))
  accelSum.monthsSaved = Math.max(0, baseSum.months - accelSum.months)
  return accelSum
}

/** Standard (no extra payments) loan result — used for comparisons. */
export function calculateStandardLoan(principal: number, apr: number, termMonths: number, startDate: string): LoanResult {
  return summarize(buildAmortization({ principal, apr, termMonths, startDate }), startDate)
}
