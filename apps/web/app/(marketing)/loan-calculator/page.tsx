'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Area, AreaChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ArrowUpRight, Calculator } from 'lucide-react'
import { calculateLoan } from '@/lib/finance/loans'
import { formatCurrency, formatDate, round2 } from '@/lib/format'
import '@/app/ledger.css'

const fieldClass =
  'w-full border-0 border-b border-[var(--rule-strong)] bg-transparent px-0 py-2.5 text-[0.9375rem] text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-3)] focus:border-[var(--ink)]'

export default function PublicLoanCalculator() {
  const [i, setI] = useState({
    loanAmount: 15000, apr: 9.5, termMonths: 48,
    startDate: format(new Date(), 'yyyy-MM-dd'), extraMonthly: 0,
  })
  const set = (patch: Partial<typeof i>) => setI((p) => ({ ...p, ...patch }))

  const r = useMemo(() => calculateLoan({
    principal: i.loanAmount, apr: i.apr, termMonths: i.termMonths,
    startDate: i.startDate, extraMonthly: i.extraMonthly,
  }), [i])

  return (
    <div className="ledger-grain relative">
      <div className="ledger-rules pointer-events-none absolute inset-0 opacity-40" aria-hidden />

      <section className="relative z-10 border-b border-[var(--rule-strong)] px-5 pb-14 pt-16 sm:px-8 sm:pt-24">
        <div className="mx-auto max-w-[1100px]">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.2, 0.8, 0.3, 1] }}>
            <p className="kicker flex items-center gap-3 text-[var(--ink-3)]">
              <span className="inline-block h-px w-10 bg-[var(--rust)]" />
              Free tool · no account needed
            </p>
            <h1 className="display mt-6 text-[2.75rem] leading-[0.94] sm:text-[4rem]">
              Loan <span className="display-i text-[var(--rust)]">calculator.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--ink-2)]">
              Personal, student, or fixed-rate installment loans — full amortization schedule, extra-payment modeling, no signup required.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 px-5 py-14 sm:px-8">
        <div className="mx-auto grid max-w-[1100px] gap-10 lg:grid-cols-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-70px' }} transition={{ duration: 0.5 }}
            className="border border-[var(--ink)] bg-[var(--paper-2)] p-7 sm:p-9 lg:col-span-5"
          >
            <div className="space-y-6">
              <div>
                <label htmlFor="loanAmount" className="kicker text-[var(--ink-3)]">Loan amount</label>
                <input
                  id="loanAmount" type="number" min={500} step={500}
                  value={i.loanAmount} onChange={(e) => set({ loanAmount: Math.max(0, Number(e.target.value)) })}
                  className={`${fieldClass} mt-2 fig`}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label htmlFor="apr" className="kicker text-[var(--ink-3)]">APR %</label>
                  <input
                    id="apr" type="number" min={0} max={40} step={0.05}
                    value={i.apr} onChange={(e) => set({ apr: round2(Math.max(0, Number(e.target.value))) })}
                    className={`${fieldClass} mt-2 fig`}
                  />
                </div>
                <div>
                  <label htmlFor="term" className="kicker text-[var(--ink-3)]">Term (months)</label>
                  <input
                    id="term" type="number" min={1} max={480} step={6}
                    value={i.termMonths} onChange={(e) => set({ termMonths: Math.max(1, Number(e.target.value)) })}
                    className={`${fieldClass} mt-2 fig`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label htmlFor="startDate" className="kicker text-[var(--ink-3)]">First payment</label>
                  <input
                    id="startDate" type="date" value={i.startDate}
                    onChange={(e) => set({ startDate: e.target.value })}
                    className={`${fieldClass} mt-2 fig`}
                  />
                </div>
                <div>
                  <label htmlFor="extra" className="kicker text-[var(--ink-3)]">Extra monthly</label>
                  <input
                    id="extra" type="number" min={0} step={10}
                    value={i.extraMonthly} onChange={(e) => set({ extraMonthly: Math.max(0, Number(e.target.value)) })}
                    className={`${fieldClass} mt-2 fig`}
                  />
                </div>
              </div>
            </div>

            <div className="mt-9 border-t border-[var(--rule)] pt-7">
              <p className="text-sm leading-relaxed text-[var(--ink-3)]">
                Want to save this scenario, compare it against others, or model a car loan with trade-in and fees?
              </p>
              <Link href="/sign-up" className="btn-lime mt-4 inline-flex">
                Sign up to save it <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-70px' }} transition={{ duration: 0.5, delay: 0.08 }}
            className="lg:col-span-7"
          >
            <div className="border border-[var(--rule-strong)] bg-[var(--paper)] p-7 sm:p-9">
              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <p className="kicker text-[var(--ink-3)]">Monthly payment</p>
                  <p className="display mt-1.5 text-[2rem] text-[var(--rust)]">{formatCurrency(r.monthlyPayment, { decimals: 0 })}</p>
                </div>
                <div>
                  <p className="kicker text-[var(--ink-3)]">Total interest</p>
                  <p className="display mt-1.5 text-[2rem]">{formatCurrency(r.totalInterest, { decimals: 0 })}</p>
                  {r.interestSaved > 0 && <p className="fig mt-1 text-xs text-[var(--moss)]">{formatCurrency(r.interestSaved, { decimals: 0 })} saved with extras</p>}
                </div>
                <div>
                  <p className="kicker text-[var(--ink-3)]">Payoff date</p>
                  <p className="display mt-1.5 text-[2rem]">{formatDate(r.payoffDate, 'MMM yyyy')}</p>
                  {r.monthsSaved > 0 && <p className="fig mt-1 text-xs text-[var(--moss)]">{r.monthsSaved} months earlier</p>}
                </div>
              </div>

              <div className="mt-8 h-56 border-t border-[var(--rule)] pt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={r.schedule.filter((_, k) => k % Math.max(1, Math.ceil(r.schedule.length / 50)) === 0)}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => format(parseISO(v), 'MMM yy')} minTickGap={36} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={38} />
                    <RTooltip formatter={(v: number) => formatCurrency(v, { decimals: 0 })} labelFormatter={(v) => format(parseISO(v as string), 'MMM yyyy')} />
                    <Area type="monotone" dataKey="endingBalance" name="Balance" stroke="var(--rust)" fill="var(--rust)" fillOpacity={0.12} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="fig mt-3 text-xs text-[var(--ink-3)]">
                Total paid: {formatCurrency(r.totalPaid, { decimals: 0 })} over {r.months} payments.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 border-t border-[var(--rule-strong)] bg-[var(--ink)] px-5 py-20 text-center text-[var(--paper)] sm:px-8">
        <Calculator className="mx-auto h-7 w-7 text-[var(--lime)]" strokeWidth={1.75} />
        <p className="display mt-5 text-[1.75rem] sm:text-[2.25rem]">Pennyward has the full picture.</p>
        <p className="mt-3 max-w-md mx-auto text-sm text-[var(--paper-2)]/80">
          Debt payoff strategies, car-loan trade-in math, budgets, and net worth — all in one free account.
        </p>
        <Link href="/sign-up" className="btn-lime mt-7 inline-flex">
          Create a free account <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
        </Link>
      </section>
    </div>
  )
}
