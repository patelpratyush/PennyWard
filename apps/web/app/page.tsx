'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { Area, AreaChart, Line, LineChart, ResponsiveContainer } from 'recharts'
import { ArrowUpRight } from 'lucide-react'
import { calculateCarLoan } from '@/lib/finance/carLoan'
import { compareStrategies } from '@/lib/finance/debt'
import { formatCurrency } from '@/lib/format'
import type { Debt } from '@/types'
import './ledger.css'

/* ── Scroll reveal ────────────────────────────────────────────────────────── */
const reveal = (i = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-70px' },
  transition: { duration: 0.55, delay: i * 0.07, ease: [0.2, 0.8, 0.3, 1] as const },
})

/* ── A representative household, run through the real payoff engine ───────── */
const demoDebts: Debt[] = [
  { id: 'd1', name: 'Auto loan', lender: 'Honda Financial', type: 'auto_loan', balance: 27420, originalBalance: 33500, apr: 5.99, minimumPayment: 647, dueDay: 15 },
  { id: 'd2', name: 'Credit card', lender: 'Capital One', type: 'credit_card', balance: 2750, originalBalance: 5200, apr: 24.99, minimumPayment: 95, dueDay: 25 },
  { id: 'd3', name: 'Student loan', lender: 'Aidvantage', type: 'student_loan', balance: 16800, originalBalance: 24500, apr: 4.75, minimumPayment: 210, dueDay: 20 },
]

const features: [string, string][] = [
  ['Spending tracking', 'Import a CSV or add rows by hand. Filter, split, tag, and search every transaction you own.'],
  ['Monthly budgeting', 'Category budgets with rollover, suggested amounts, and on-track indicators that stay calm.'],
  ['Debt payoff planning', 'Snowball, avalanche, and custom orders compared side by side with real dates and interest saved.'],
  ['Car-loan calculations', 'Taxes, doc fees, trade-ins, negative equity. See a vehicle’s true cost before you sign.'],
  ['Savings goals', 'Emergency funds, vacations, down payments — with milestones and the monthly number to hit.'],
  ['Bills & calendar', 'Recurring bills, autopay tracking, reminders, and a month view of every due date.'],
  ['Net-worth tracking', 'Assets minus liabilities over time, broken out by account, snapshotted nightly.'],
  ['Stock watchlists', 'Follow the companies you care about with notes and price history. No trading pressure.'],
  ['Financial reports', 'Cash flow, budget performance, category trends, and net worth — all exportable to CSV.'],
  ['Decision simulator', 'Model a purchase and watch it ripple through monthly cash flow and lifetime interest.'],
]

const ticker = [
  'AMORTIZATION TO THE CENT',
  'SNOWBALL VS AVALANCHE',
  'CSV IMPORT WITH DEDUPE',
  'READ-ONLY BANK CONNECTIONS',
  'NO DATA RESOLD, EVER',
  'EXPORT EVERYTHING, ANYTIME',
  'ZERO-PERCENT APR HANDLED',
  'TRADE-IN & NEGATIVE EQUITY',
]

const quotes = [
  { q: 'The calculator showed me the doc fees and tax rolled into financing before I signed. I negotiated $900 off because of it.', name: 'Maya R.', role: 'Nurse · two car loans' },
  { q: 'Seeing the exact month my card hits zero is what kept me consistent. The snowball plan is simple and it just works.', name: 'Daniel K.', role: 'New parent · building a fund' },
  { q: 'CSV import took ten minutes and suddenly I could see where the money actually goes. The budget view is calm, not judgy.', name: 'Priya S.', role: 'First-time budgeter' },
]

const faqs: [string, string][] = [
  ['Is Pennyward secure?', 'Every request is scoped to your account and validated server-side. The production service is built around encrypted transport, read-only bank connections, and modern session auth. We never sell personal financial data.'],
  ['Can I connect my bank?', 'Plaid connections are on the roadmap and will be strictly read-only — Pennyward can never move your money. Today, CSV import covers every major bank export format.'],
  ['How does CSV import work?', 'Upload your bank’s export, map the date, amount, and merchant columns, preview the rows. Pennyward hashes each row and flags duplicates before anything is written.'],
  ['How accurate is the loan math?', 'Standard amortization with cent-level rounding at every step. Extra payments, one-time lump sums, and 0% APR are all supported, and the final payment is adjusted so a balance never goes negative.'],
  ['Does Pennyward give financial advice?', 'No. Pennyward provides calculations, tracking, and educational information. It is not investment, tax, or legal advice.'],
  ['Can I export my data?', 'Yes. Every report exports to CSV, and Settings → Data hands you the entire workspace as JSON. Account deletion is real deletion.'],
]

const pricing = [
  { name: 'Free', price: '$0', per: 'forever', blurb: 'Manual tracking, basic budgeting, the full calculator suite.', cta: 'Start free' },
  { name: 'Pro', price: '$8', per: 'per month', blurb: 'CSV imports, unlimited budgets and payoff scenarios, advanced reports.', cta: 'Go Pro', featured: true },
  { name: 'Household', price: '$14', per: 'per month', blurb: 'Everything in Pro, shared across two people with joint dashboards.', cta: 'Choose Household' },
]

const nav = [
  ['Features', '/features'],
  ['Pricing', '/pricing'],
  ['Security', '/security'],
  ['Calculator', '/app/loans/car-calculator'],
]

export default function Landing() {
  const startMonth = format(new Date(), 'yyyy-MM')
  const plans = compareStrategies(demoDebts, 300, 0, startMonth)
  const baseline = plans.minimum
  const best = plans.avalanche

  const totalDebt = demoDebts.reduce((s, d) => s + d.balance, 0)
  const freeBy = format(parseISO(best.debtFreeDate), 'MMM yyyy')
  const baselineFreeBy = format(parseISO(baseline.debtFreeDate), 'MMM yyyy')
  const yearsSaved = (best.monthsSaved / 12).toFixed(1)

  const balanceCurve = best.timeline
    .filter((_, i) => i % 2 === 0)
    .map((t) => ({ m: t.month, balance: t.totalBalance }))

  const car = calculateCarLoan({
    vehiclePrice: 38500, downPayment: 5000, tradeInValue: 0, tradeInOwed: 0, rebate: 0,
    taxRate: 6.625, docFee: 399, registrationFee: 240, destinationFee: 1395, dealerFees: 0,
    apr: 5.99, termMonths: 60, startDate: new Date().toISOString().slice(0, 10),
    extraMonthly: 100, oneTimePayment: 0,
  })

  return (
    <div className="ledger min-h-screen">
      {/* ══ Masthead ══════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-[var(--rule-strong)] bg-[var(--paper)]/92 backdrop-blur-[6px]">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-8 px-5 sm:px-8">
          <Link href="/" className="display text-[1.6rem] leading-none tracking-[-0.03em]">
            Pennyward<span className="text-[var(--rust)]">.</span>
          </Link>
          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
            {nav.map(([label, to]) => (
              <Link
                key={label}
                href={to}
                className="kicker text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/sign-in" className="kicker hidden text-[var(--ink-3)] transition-colors hover:text-[var(--ink)] sm:block">
              Sign in
            </Link>
            <Link href="/sign-up" className="btn-lime !px-5 !py-2.5 !text-[0.6875rem]">
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* ══ Hero ══════════════════════════════════════════════════════════ */}
      <section className="ledger-grain relative overflow-hidden border-b border-[var(--rule-strong)]">
        <div className="ledger-rules pointer-events-none absolute inset-0 opacity-55" aria-hidden />
        <div className="pointer-events-none absolute -right-[8%] -top-[18%] hidden select-none lg:block" aria-hidden>
          <span className="display text-[34rem] leading-none text-[var(--ink)] opacity-[0.035]">$</span>
        </div>

        <div className="relative z-10 mx-auto grid max-w-[1400px] gap-14 px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-12 lg:gap-8">
          {/* Left column — the argument */}
          <div className="lg:col-span-7">
            <div className="rise kicker flex items-center gap-3 text-[var(--ink-3)]" style={{ animationDelay: '0.05s' }}>
              <span className="inline-block h-px w-10 bg-[var(--rust)]" />
              Personal finance, plainly accounted
            </div>

            <h1 className="display mt-7 text-[3.4rem] sm:text-[5rem] lg:text-[5.6rem]">
              <span className="rise block" style={{ animationDelay: '0.14s' }}>Know where</span>
              <span className="rise block" style={{ animationDelay: '0.22s' }}>your money goes.</span>
              <span className="rise mt-2 block" style={{ animationDelay: '0.3s' }}>
                <span className="display-i relative inline-block text-[var(--rust)]">
                  Then decide
                  <svg
                    className="absolute -bottom-2 left-0 w-full"
                    height="10"
                    viewBox="0 0 300 10"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <path d="M2 7 C 70 2, 150 9, 298 3" stroke="var(--lime-deep)" strokeWidth="4" fill="none" strokeLinecap="round" />
                  </svg>
                </span>{' '}
                where it goes next.
              </span>
            </h1>

            <p
              className="rise mt-9 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--ink-2)]"
              style={{ animationDelay: '0.4s' }}
            >
              Spending, budgets, loan math, and a debt payoff plan with dates you can actually
              circle on a calendar — worked out to the cent, in one dashboard that doesn’t
              lecture you.
            </p>

            <div className="rise mt-10 flex flex-wrap items-center gap-4" style={{ animationDelay: '0.48s' }}>
              <Link href="/sign-up" className="btn-lime">
                Start for free <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
              <Link href="/app/dashboard" className="btn-ghost">
                Open the live demo
              </Link>
            </div>

            <p className="rise kicker mt-6 text-[var(--ink-3)]" style={{ animationDelay: '0.56s' }}>
              No card required · Free plan stays free
            </p>
          </div>

          {/* Right column — the receipt */}
          <div className="lg:col-span-5">
            <div
              className="tilt-in relative border border-[var(--ink)] bg-[var(--paper-2)] p-6 shadow-[8px_8px_0_0_var(--ink)] sm:p-7"
              style={{ animationDelay: '0.34s' }}
            >
              <div className="flex items-baseline justify-between border-b border-dashed border-[var(--rule-strong)] pb-4">
                <span className="kicker">Payoff statement</span>
                <span className="kicker text-[var(--ink-3)]">No. 001</span>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                {demoDebts.map((d) => (
                  <div key={d.id} className="leader">
                    <span className="text-[var(--ink-2)]">
                      {d.name}
                      <span className="fig ml-2 text-xs text-[var(--ink-3)]">{d.apr.toFixed(2)}%</span>
                    </span>
                    <span className="fig font-medium">{formatCurrency(d.balance, { decimals: 0 })}</span>
                  </div>
                ))}
                <div className="leader border-t border-[var(--rule-strong)] pt-3">
                  <span className="kicker">Total owed</span>
                  <span className="fig text-lg font-bold">{formatCurrency(totalDebt, { decimals: 0 })}</span>
                </div>
              </div>

              <div className="mt-6 border-t border-dashed border-[var(--rule-strong)] pt-5">
                <p className="kicker text-[var(--ink-3)]">Avalanche · $300 extra per month</p>
                <p className="display mt-3 text-[3.75rem] leading-[0.85]">{freeBy}</p>
                <p className="kicker mt-2 text-[var(--rust)]">Debt-free date</p>

                <div className="mt-5 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={balanceCurve} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--rust)" stopOpacity={0.32} />
                          <stop offset="100%" stopColor="var(--rust)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="var(--rust)"
                        strokeWidth={2}
                        fill="url(#heroFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[var(--rule-strong)] pt-4">
                  <div>
                    <p className="fig text-xl font-bold text-[var(--moss)]">
                      {formatCurrency(best.interestSaved, { decimals: 0 })}
                    </p>
                    <p className="kicker mt-1 text-[var(--ink-3)]">Interest saved</p>
                  </div>
                  <div>
                    <p className="fig text-xl font-bold">{best.monthsSaved} mo</p>
                    <p className="kicker mt-1 text-[var(--ink-3)]">Sooner than minimums</p>
                  </div>
                </div>
              </div>

              <p className="kicker mt-5 text-[0.625rem] leading-relaxed text-[var(--ink-3)]">
                Computed live by Pennyward’s engine from the balances above
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ The number, at broadsheet scale ═══════════════════════════════ */}
      <section className="relative overflow-hidden border-b border-[var(--rule-strong)] bg-[var(--ink)] py-20 text-[var(--paper)]">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
          <motion.div {...reveal()} className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="kicker text-[var(--lime)]">The difference a plan makes</p>
              <p className="display mt-6 text-[4rem] leading-[0.86] sm:text-[6.5rem] lg:text-[7.5rem]">
                {yearsSaved} years
              </p>
              <p className="display-i mt-3 text-3xl text-[var(--paper-3)] sm:text-4xl">
                shaved off the same three balances.
              </p>
            </div>
            <div className="space-y-6 lg:col-span-5">
              <div className="border-l-2 border-[var(--lime)] pl-5">
                <p className="kicker text-[var(--paper-3)]">Paying the minimums</p>
                <p className="fig mt-1 text-2xl">
                  Debt-free {baselineFreeBy} · {formatCurrency(baseline.totalInterest, { decimals: 0 })} interest
                </p>
              </div>
              <div className="border-l-2 border-[var(--rust)] pl-5">
                <p className="kicker text-[var(--paper-3)]">Avalanche, $300 extra</p>
                <p className="fig mt-1 text-2xl">
                  Debt-free {freeBy} · {formatCurrency(best.totalInterest, { decimals: 0 })} interest
                </p>
              </div>
              <p className="text-sm leading-relaxed text-[var(--paper-3)]">
                Same income. Same balances. The only variable is knowing which debt to hit first
                — which is exactly the thing Pennyward computes for you.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ Ticker ════════════════════════════════════════════════════════ */}
      <div className="overflow-hidden border-b border-[var(--rule-strong)] bg-[var(--lime)] py-3.5">
        <div className="marquee">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 items-center" aria-hidden={dup === 1}>
              {ticker.map((t) => (
                <span key={t} className="kicker flex items-center whitespace-nowrap text-[var(--ink)]">
                  {t}
                  <span className="mx-7 text-[var(--ink)] opacity-40">✳</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ══ Features, as an editorial index ═══════════════════════════════ */}
      <section className="border-b border-[var(--rule-strong)] px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1400px]">
          <motion.div {...reveal()} className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="kicker text-[var(--ink-3)]">Contents</p>
              <h2 className="display mt-5 text-[2.75rem] leading-[0.94] sm:text-[3.5rem]">
                Ten tools.<br />
                <span className="display-i">No dashboard sprawl.</span>
              </h2>
              <p className="mt-6 max-w-sm text-[var(--ink-2)]">
                Each one answers a question you’ve actually asked out loud about your own
                money. Nothing here exists to fill a feature grid.
              </p>
              <div className="rule-draw mt-8 h-px w-full bg-[var(--rule-strong)]" />
            </div>

            <div className="lg:col-span-8">
              <div className="border-b border-[var(--rule)]">
                {features.map(([title, blurb], i) => (
                  <Link key={title} href="/features" className="index-row group">
                    <span className="fig pt-1 text-sm text-[var(--ink-3)]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>
                      <span className="flex items-baseline gap-2">
                        <span className="display text-[1.75rem] leading-tight sm:text-[2rem]">{title}</span>
                        <ArrowUpRight
                          className="h-4 w-4 shrink-0 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                          strokeWidth={2.5}
                        />
                      </span>
                      <span className="index-blurb mt-1.5 block max-w-lg text-sm leading-relaxed">
                        {blurb}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ Worked example ════════════════════════════════════════════════ */}
      <section className="ledger-grain relative overflow-hidden border-b border-[var(--rule-strong)] bg-[var(--paper-2)] px-5 py-24 sm:px-8">
        <div className="relative z-10 mx-auto grid max-w-[1400px] gap-14 lg:grid-cols-12 lg:gap-10">
          <motion.div {...reveal()} className="lg:col-span-5">
            <p className="kicker text-[var(--rust)]">Worked example № 1</p>
            <h2 className="display mt-6 text-[2.5rem] leading-[0.95] sm:text-[3.25rem]">
              “What does a{' '}
              <span className="display-i">$38,500 car</span> really cost me?”
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-[var(--ink-2)]">
              Sticker price is the number they show you. Pennyward works the rest: sales tax on
              the taxable amount, doc and destination fees, what gets financed, and what an
              extra hundred a month does to the tail of the loan.
            </p>
            <Link href="/app/loans/car-calculator" className="btn-ink mt-9">
              Run your own numbers <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          </motion.div>

          <motion.div {...reveal(1)} className="lg:col-span-7">
            <div className="border border-[var(--ink)] bg-[var(--paper)] p-7 sm:p-9">
              <div className="flex items-baseline justify-between border-b border-[var(--ink)] pb-4">
                <span className="kicker">60-month note · 5.99% APR</span>
                <span className="kicker text-[var(--ink-3)]">NJ · 6.625% tax</span>
              </div>

              <div className="mt-6 space-y-3.5 text-[0.9375rem]">
                {([
                  ['Vehicle price', 38500],
                  ['Sales tax', car.taxes],
                  ['Doc, registration & destination', car.totalFees],
                  ['Cash down at signing', -5000],
                ] as [string, number][]).map(([label, v]) => (
                  <div key={label} className="leader">
                    <span className="text-[var(--ink-2)]">{label}</span>
                    <span className="fig">{formatCurrency(v, { decimals: 0 })}</span>
                  </div>
                ))}

                <div className="leader border-t border-[var(--ink)] pt-3.5">
                  <span className="font-semibold">Amount financed</span>
                  <span className="fig text-lg font-bold">{formatCurrency(car.amountFinanced, { decimals: 0 })}</span>
                </div>
              </div>

              <div className="mt-8 grid gap-7 border-t border-dashed border-[var(--rule-strong)] pt-7 sm:grid-cols-2">
                <div>
                  <p className="kicker text-[var(--ink-3)]">Monthly payment</p>
                  <p className="fig mt-2 text-[2.5rem] font-bold leading-none">
                    {formatCurrency(car.standardMonthlyPayment, { decimals: 0 })}
                  </p>
                  <p className="mt-3 text-sm text-[var(--ink-3)]">
                    Lifetime interest{' '}
                    <span className="fig font-semibold text-[var(--ink)]">
                      {formatCurrency(car.totalInterest + car.interestSaved, { decimals: 0 })}
                    </span>
                  </p>
                </div>
                <div className="border-l-0 sm:border-l sm:border-[var(--rule-strong)] sm:pl-7">
                  <p className="kicker text-[var(--moss)]">Add $100 / month</p>
                  <p className="fig mt-2 text-[2.5rem] font-bold leading-none text-[var(--moss)]">
                    −{formatCurrency(car.interestSaved, { decimals: 0 })}
                  </p>
                  <p className="mt-3 text-sm text-[var(--ink-3)]">
                    Interest avoided, paid off{' '}
                    <span className="fig font-semibold text-[var(--ink)]">{car.monthsSaved} months</span> early
                  </p>
                </div>
              </div>

              <div className="mt-7 h-20 border-t border-[var(--rule-strong)] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={car.schedule.filter((_, i) => i % 3 === 0)}>
                    <Line
                      type="monotone"
                      dataKey="endingBalance"
                      stroke="var(--ink)"
                      strokeWidth={1.75}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="kicker mt-3 text-[0.625rem] text-[var(--ink-3)]">
                Declining principal · estimates only, taxes and fees vary by state and dealer
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ Pull quotes ═══════════════════════════════════════════════════ */}
      <section className="border-b border-[var(--rule-strong)] px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1400px]">
          <motion.p {...reveal()} className="kicker text-[var(--ink-3)]">
            From the margins
          </motion.p>
          <div className="mt-12 grid gap-14 md:grid-cols-3 md:gap-10">
            {quotes.map((t, i) => (
              <motion.figure
                key={t.name}
                {...reveal(i)}
                className={i === 1 ? 'md:mt-16' : i === 2 ? 'md:mt-7' : ''}
              >
                <span className="display block text-[5rem] leading-[0.5] text-[var(--lime-deep)]" aria-hidden>
                  “
                </span>
                <blockquote className="display mt-6 text-[1.5rem] leading-[1.28] sm:text-[1.625rem]">
                  {t.q}
                </blockquote>
                <figcaption className="mt-6 border-t border-[var(--rule-strong)] pt-4">
                  <p className="kicker">{t.name}</p>
                  <p className="mt-1.5 text-sm text-[var(--ink-3)]">{t.role}</p>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Pricing, as a ledger ══════════════════════════════════════════ */}
      <section className="border-b border-[var(--rule-strong)] bg-[var(--paper-2)] px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1100px]">
          <motion.div {...reveal()} className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="display text-[2.75rem] leading-[0.94] sm:text-[3.5rem]">
              Priced like<br /><span className="display-i">a utility.</span>
            </h2>
            <p className="max-w-sm text-[var(--ink-2)]">
              Subscriptions are the whole business model — which is precisely why your data is
              never the product.
            </p>
          </motion.div>

          <motion.div {...reveal(1)} className="mt-14 border-t border-[var(--ink)]">
            {pricing.map((p) => (
              <div
                key={p.name}
                className={`price-row grid items-center gap-5 border-b border-[var(--rule)] px-4 py-7 sm:grid-cols-12 sm:px-6 ${
                  p.featured ? 'border-l-4 border-l-[var(--lime-deep)] bg-[var(--paper)]' : ''
                }`}
              >
                <div className="sm:col-span-3">
                  <p className="display text-[2rem] leading-none">{p.name}</p>
                  {p.featured && <p className="kicker mt-2 text-[var(--rust)]">Most chosen</p>}
                </div>
                <div className="sm:col-span-3">
                  <p className="fig text-[2.25rem] font-bold leading-none">{p.price}</p>
                  <p className="kicker mt-1.5 text-[var(--ink-3)]">{p.per}</p>
                </div>
                <p className="text-sm leading-relaxed text-[var(--ink-2)] sm:col-span-4">{p.blurb}</p>
                <div className="sm:col-span-2 sm:text-right">
                  <Link
                    href="/pricing"
                    className="kicker inline-flex items-center gap-1.5 border-b border-[var(--ink)] pb-0.5 transition-colors hover:border-[var(--rust)] hover:text-[var(--rust)]"
                  >
                    {p.cta} <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </Link>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ FAQ ═══════════════════════════════════════════════════════════ */}
      <section className="border-b border-[var(--rule-strong)] px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-12">
          <motion.div {...reveal()} className="lg:col-span-4">
            <p className="kicker text-[var(--ink-3)]">Queries</p>
            <h2 className="display mt-5 text-[2.75rem] leading-[0.94]">
              Asked<br /><span className="display-i">and answered.</span>
            </h2>
          </motion.div>
          <motion.div {...reveal(1)} className="lg:col-span-8">
            <div className="border-b border-[var(--rule)]">
              {faqs.map(([q, a], i) => (
                <details key={q} className="faq-item group">
                  <summary>
                    <span className="fig text-sm text-[var(--ink-3)]">{String(i + 1).padStart(2, '0')}</span>
                    <span className="faq-q display text-[1.375rem] leading-snug transition-colors sm:text-[1.5rem]">
                      {q}
                    </span>
                  </summary>
                  <p className="faq-answer max-w-2xl pb-6 pl-[2.4rem] text-[0.9375rem] leading-relaxed text-[var(--ink-2)]">
                    {a}
                  </p>
                </details>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ Closing CTA ═══════════════════════════════════════════════════ */}
      <section className="ledger-grain relative overflow-hidden bg-[var(--ink)] px-5 py-28 text-[var(--paper)] sm:px-8">
        <div className="pointer-events-none absolute -bottom-[30%] -left-[6%] select-none" aria-hidden>
          <span className="display text-[28rem] leading-none text-[var(--paper)] opacity-[0.04]">₵</span>
        </div>
        <motion.div {...reveal()} className="relative z-10 mx-auto max-w-[1000px] text-center">
          <p className="kicker text-[var(--lime)]">Open an account</p>
          <h2 className="display mt-7 text-[3rem] leading-[0.9] sm:text-[4.5rem]">
            Put a date on<br />
            <span className="display-i text-[var(--lime)]">being debt-free.</span>
          </h2>
          <p className="mx-auto mt-8 max-w-md leading-relaxed text-[var(--paper-3)]">
            Free plan, no card. Import your first CSV in ten minutes and see the whole picture
            by lunch.
          </p>
          <div className="mt-11 flex flex-wrap items-center justify-center gap-4">
            <Link href="/sign-up" className="btn-lime">
              Start for free <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
            <Link
              href="/app/dashboard"
              className="btn-ghost !border-[var(--paper-3)] !text-[var(--paper)] hover:!bg-[var(--paper)] hover:!text-[var(--ink)]"
            >
              Tour the demo
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ══ Colophon ══════════════════════════════════════════════════════ */}
      <footer className="bg-[var(--ink)] px-5 pb-12 text-[var(--paper-3)] sm:px-8">
        <div className="mx-auto max-w-[1400px] border-t border-[var(--ink-2)] pt-12">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-4">
              <p className="display text-[1.75rem] leading-none text-[var(--paper)]">
                Pennyward<span className="text-[var(--rust)]">.</span>
              </p>
              <p className="mt-4 max-w-xs text-sm leading-relaxed">
                Know where your money goes. Then decide where it goes next.
              </p>
            </div>
            {([
              ['Product', [['Features', '/features'], ['Pricing', '/pricing'], ['Security', '/security'], ['Calculator', '/app/loans/car-calculator']]],
              ['Company', [['About', '/about'], ['Contact', '/contact'], ['Help center', '/help']]],
              ['Legal', [['Privacy', '/privacy'], ['Terms', '/terms']]],
            ] as [string, [string, string][]][]).map(([title, links]) => (
              <div key={title} className="md:col-span-2">
                <p className="kicker text-[var(--paper)]">{title}</p>
                <ul className="mt-4 space-y-2.5">
                  {links.map(([label, to]) => (
                    <li key={label}>
                      <Link href={to} className="text-sm transition-colors hover:text-[var(--lime)]">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="md:col-span-2">
              <p className="kicker text-[var(--paper)]">Account</p>
              <ul className="mt-4 space-y-2.5">
                <li><Link href="/sign-in" className="text-sm transition-colors hover:text-[var(--lime)]">Sign in</Link></li>
                <li><Link href="/sign-up" className="text-sm transition-colors hover:text-[var(--lime)]">Start free</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--ink-2)] pt-6">
            <p className="kicker text-[0.625rem]">© 2026 Pennyward · All rights reserved</p>
            <p className="kicker text-[0.625rem] text-[var(--ink-3)]">
              A tracking &amp; planning tool — not a financial advisor
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
