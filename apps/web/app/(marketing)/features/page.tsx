'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowUpRight, Bell, Calculator, Car, CreditCard, FileBarChart, Goal,
  Landmark, LineChart, PiggyBank, Receipt, ShieldCheck, TrendingUp, Wallet,
} from 'lucide-react'
import '@/app/ledger.css'

const reveal = (i = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-70px' },
  transition: { duration: 0.55, delay: i * 0.05, ease: [0.2, 0.8, 0.3, 1] as const },
})

const sections = [
  { id: 'dashboard', icon: LineChart, title: 'Dashboard', text: 'A calm morning briefing: net worth, cash flow, budget progress, upcoming bills, goals, and rules-based insights — all in one glance.',
    bullets: ['Six summary cards with trends and sparklines', 'Income vs. expenses chart with period controls', 'Customizable, reorderable widgets'] },
  { id: 'transactions', icon: Receipt, title: 'Transactions', text: 'Every dollar, accounted for. Add manually, import CSVs, split across categories, tag, filter, and bulk-edit.',
    bullets: ['Powerful filters: account, category, amount, tags', 'Split transactions and transfers', 'Bulk category updates and delete'] },
  { id: 'budgeting', icon: Wallet, title: 'Budgeting', text: 'A monthly budget workspace with grouped categories, rollover, suggested amounts, and money-left-to-assign.',
    bullets: ['On-track / near-limit / over-budget statuses', 'Copy last month, reorder categories', 'Detail drawer with spending trends'] },
  { id: 'accounts', icon: Landmark, title: 'Accounts', text: 'Checking, savings, credit cards, loans, and investments grouped cleanly with balance history and stats.',
    bullets: ['Include or exclude from net worth', 'Manual balance adjustments', 'Per-account inflow and outflow stats'] },
  { id: 'car-loans', icon: Car, title: 'Car loans', text: 'The most complete car calculator: taxes, fees, trade-in equity, rebates, extra payments, and affordability.',
    bullets: ['Cash due at signing and amount financed', 'Standard vs. accelerated payoff charts', 'Transportation-cost affordability check'] },
  { id: 'loans', icon: Calculator, title: 'General loans', text: 'Personal, student, and fixed-rate installment loans with full amortization schedules.',
    bullets: ['Extra and one-time payment modeling', 'Year-grouped amortization tables', 'CSV export and print'] },
  { id: 'debt-payoff', icon: CreditCard, title: 'Debt payoff', text: 'Snowball, avalanche, or your own order. See your debt-free date, interest saved, and month-by-month allocation.',
    bullets: ['Strategy comparison table', 'Payoff timeline and milestones', 'Saved plans you can revisit'] },
  { id: 'goals', icon: PiggyBank, title: 'Goals', text: 'Emergency funds, vacations, and down payments with required monthly contributions and milestone celebrations.',
    bullets: ['On-track detection', 'Contribution history', 'Completion estimates'] },
  { id: 'bills', icon: Bell, title: 'Bills', text: 'A monthly calendar of due dates, autopay status, reminders, and income events.',
    bullets: ['Weekly to annual recurrence', 'Mark paid or skip an occurrence', 'Overdue section'] },
  { id: 'stocks', icon: TrendingUp, title: 'Stocks', text: 'Informational watchlists with notes and price history — designed for awareness, not day-trading.',
    bullets: ['Search by company or ticker', 'Multiple watchlists with notes', 'Educational disclaimer throughout'] },
  { id: 'reports', icon: FileBarChart, title: 'Reports', text: 'Monthly spending, cash flow, budget performance, and net-worth reports — all exportable.',
    bullets: ['Date, account, and category filters', 'Charts plus data tables', 'CSV export and print'] },
  { id: 'security', icon: ShieldCheck, title: 'Security', text: 'Private by design with read-only connections planned, easy export, and full deletion controls.',
    bullets: ['No selling personal data', 'Two-factor authentication roadmap', 'Session management'] },
]

export default function Features() {
  return (
    <div className="ledger-grain relative">
      <div className="ledger-rules pointer-events-none absolute inset-0 opacity-40" aria-hidden />

      {/* ══ Masthead intro ═══════════════════════════════════════════════ */}
      <section className="relative z-10 border-b border-[var(--rule-strong)] px-5 pb-16 pt-16 sm:px-8 sm:pt-24">
        <div className="mx-auto max-w-[1400px]">
          <motion.div {...reveal()}>
            <p className="kicker flex items-center gap-3 text-[var(--ink-3)]">
              <span className="inline-block h-px w-10 bg-[var(--rust)]" />
              Product tour · twelve sections
            </p>
            <h1 className="display mt-7 max-w-3xl text-[2.75rem] leading-[0.94] sm:text-[4.25rem] lg:text-[5rem]">
              Every tool your<br />
              money needs<span className="display-i text-[var(--rust)]">,</span> in order.
            </h1>
            <p className="mt-7 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--ink-2)]">
              Twelve focused sections that work together — from daily spending to long-term
              debt freedom. No dashboard sprawl, no feature you didn&apos;t ask for.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ══ Editorial index of sections ═════════════════════════════════ */}
      <section className="relative z-10 px-5 py-4 sm:px-8">
        <div className="mx-auto max-w-[1400px] border-t border-[var(--ink)]">
          {sections.map((s, i) => (
            <motion.section
              key={s.id}
              id={s.id}
              {...reveal(i % 4)}
              className="scroll-mt-24 grid gap-6 border-b border-[var(--rule)] py-12 lg:grid-cols-12 lg:gap-10"
            >
              <div className="lg:col-span-1">
                <span className="fig text-sm text-[var(--ink-3)]">{String(i + 1).padStart(2, '0')}</span>
              </div>

              <div className="lg:col-span-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center border border-[var(--ink)] text-[var(--ink)]">
                    <s.icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <h2 className="display text-[2rem] leading-none sm:text-[2.5rem]">{s.title}</h2>
                </div>
                <p className="mt-5 max-w-xl leading-relaxed text-[var(--ink-2)]">{s.text}</p>
              </div>

              <div className="lg:col-span-5">
                <ul className="space-y-3 border-l border-[var(--rule-strong)] pl-5">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm leading-relaxed text-[var(--ink-2)]">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--lime-deep)]" aria-hidden />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.section>
          ))}
        </div>
      </section>

      {/* ══ Closing CTA ═══════════════════════════════════════════════════ */}
      <section className="relative z-10 bg-[var(--ink)] px-5 py-24 text-center text-[var(--paper)] sm:px-8">
        <motion.div {...reveal()} className="mx-auto max-w-xl">
          <p className="kicker text-[var(--lime)]">Ready when you are</p>
          <h2 className="display mt-6 text-[2.5rem] leading-[0.94] sm:text-[3.25rem]">
            Twelve tools.<br /><span className="display-i text-[var(--lime)]">One account.</span>
          </h2>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link href="/sign-up" className="btn-lime">
              Start for free <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
            <Link
              href="/pricing"
              className="btn-ghost !border-[var(--paper-3)] !text-[var(--paper)] hover:!bg-[var(--paper)] hover:!text-[var(--ink)]"
            >
              See pricing
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
