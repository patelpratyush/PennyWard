'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight, Check, Minus } from 'lucide-react'
import { useStore } from '@/stores/useStore'
import '@/app/ledger.css'

const reveal = (i = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-70px' },
  transition: { duration: 0.55, delay: i * 0.06, ease: [0.2, 0.8, 0.3, 1] as const },
})

const plans = [
  {
    id: 'free', name: 'Free', monthly: 0, annual: 0,
    blurb: 'Everything you need to start tracking.',
    features: ['Manual financial accounts', 'Manual transactions', 'Basic budgeting', 'Basic loan calculator', 'One saved debt-payoff plan', 'One stock watchlist', 'Basic reports'],
  },
  {
    id: 'pro', name: 'Pro', monthly: 8, annual: 76,
    blurb: 'Imports, unlimited plans, and deeper insight.',
    features: ['Everything in Free', 'CSV transaction imports', 'Unlimited budgets', 'Advanced loan scenarios', 'Unlimited debt-payoff plans', 'Savings goals', 'Advanced reports', 'Unlimited watchlists', 'Financial insights', 'Data exports'],
    recommended: true,
  },
  {
    id: 'household', name: 'Household', monthly: 14, annual: 134,
    blurb: 'Plan together with shared visibility.',
    features: ['Everything in Pro', 'Shared household dashboard', 'Shared budgets', 'Shared goals', 'Multiple members', 'Permission controls'],
  },
] as const

const comparison: [string, boolean | string, boolean | string, boolean | string][] = [
  ['Manual accounts & transactions', true, true, true],
  ['Budgets', 'Basic', 'Unlimited', 'Unlimited'],
  ['Loan calculator', 'Basic', 'Advanced scenarios', 'Advanced scenarios'],
  ['CSV transaction import', false, true, true],
  ['Debt-payoff plans', '1', 'Unlimited', 'Unlimited'],
  ['Savings goals', false, true, true],
  ['Reports', 'Basic', 'Advanced', 'Advanced'],
  ['Stock watchlists', '1', 'Unlimited', 'Unlimited'],
  ['Financial insights', false, true, true],
  ['Data export (CSV / JSON)', false, true, true],
  ['Shared household dashboard', false, false, true],
  ['Multiple members & permissions', false, false, true],
]

const faqs: [string, string][] = [
  ['Can I switch plans later?', 'Yes — upgrade or downgrade at any time from Settings → Subscription. Changes are prorated.'],
  ['What happens to my data if I downgrade?', 'Nothing is deleted. Features beyond the Free tier become read-only until you upgrade again.'],
  ['Is there a free trial for Pro?', 'Yes, Pro includes a 14-day free trial. No credit card required to start.'],
  ['How does annual billing work?', 'Annual plans are billed once per year and save about 20% versus monthly billing.'],
]

function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <Check className="mx-auto h-4 w-4 text-[var(--moss)]" strokeWidth={2.25} />
  if (v === false) return <Minus className="mx-auto h-4 w-4 text-[var(--ink-3)] opacity-50" />
  return <span className="fig text-xs font-medium">{v}</span>
}

export default function Pricing() {
  const [annual, setAnnual] = useState(true)
  const currentPlan = useStore((s) => s.profile.plan)

  return (
    <div className="ledger-grain relative">
      <div className="ledger-rules pointer-events-none absolute inset-0 opacity-40" aria-hidden />

      {/* ══ Masthead intro ═══════════════════════════════════════════════ */}
      <section className="relative z-10 border-b border-[var(--rule-strong)] px-5 pb-14 pt-16 sm:px-8 sm:pt-24">
        <div className="mx-auto max-w-[1400px]">
          <motion.div {...reveal()} className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <p className="kicker flex items-center gap-3 text-[var(--ink-3)]">
                <span className="inline-block h-px w-10 bg-[var(--rust)]" />
                Priced like a utility
              </p>
              <h1 className="display mt-7 max-w-xl text-[2.75rem] leading-[0.94] sm:text-[4rem]">
                Subscriptions are<br />
                the <span className="display-i">whole business</span> model.
              </h1>
              <p className="mt-6 max-w-md leading-relaxed text-[var(--ink-2)]">
                Which is precisely why your data is never the product. Start free. Upgrade when
                you want imports, unlimited plans, and shared household budgeting.
              </p>
            </div>

            <div className="flex items-center gap-3 border border-[var(--ink)] p-1.5">
              <button
                type="button"
                onClick={() => setAnnual(false)}
                className={`kicker px-4 py-2.5 transition-colors ${!annual ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--ink-3)]'}`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                className={`kicker flex items-center gap-2 px-4 py-2.5 transition-colors ${annual ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--ink-3)]'}`}
              >
                Annual
                <span className="rounded-none bg-[var(--lime)] px-1.5 py-0.5 text-[var(--ink)]">-20%</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ Pricing ledger ══════════════════════════════════════════════ */}
      <section className="relative z-10 px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-[1200px]">
          <motion.div {...reveal(1)} className="border-t border-[var(--ink)]">
            {plans.map((p, i) => {
              const price = annual ? p.annual : p.monthly * 12
              const isCurrent = currentPlan === p.id
              const isRecommended = 'recommended' in p && p.recommended
              return (
                <div
                  key={p.id}
                  className={`price-row grid gap-6 border-b border-[var(--rule)] px-5 py-9 sm:px-7 lg:grid-cols-12 lg:items-start lg:gap-8 ${
                    isRecommended ? 'border-l-4 border-l-[var(--lime-deep)] bg-[var(--paper-2)]' : ''
                  }`}
                >
                  <div className="lg:col-span-3">
                    <div className="flex items-center gap-3">
                      <span className="fig text-sm text-[var(--ink-3)]">{String(i + 1).padStart(2, '0')}</span>
                      <p className="display text-[2.25rem] leading-none">{p.name}</p>
                    </div>
                    {isRecommended && <p className="kicker mt-3 text-[var(--rust)]">Most chosen</p>}
                    {isCurrent && <p className="kicker mt-3 text-[var(--moss)]">Current plan</p>}
                    <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-[var(--ink-2)]">{p.blurb}</p>
                  </div>

                  <div className="lg:col-span-2">
                    <p className="fig text-[2.5rem] font-bold leading-none">
                      ${annual ? p.annual : p.monthly}
                    </p>
                    <p className="kicker mt-2 text-[var(--ink-3)]">
                      {p.monthly === 0 ? 'forever' : annual ? 'per year' : 'per month'}
                    </p>
                    {annual && p.monthly > 0 && (
                      <p className="fig mt-1.5 text-xs text-[var(--moss)]">
                        ${(p.monthly * 12 - price).toFixed(0)} saved vs monthly
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2 lg:col-span-5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm leading-relaxed text-[var(--ink-2)]">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--moss)]" strokeWidth={2.25} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="lg:col-span-2 lg:text-right">
                    {isCurrent ? (
                      <span className="kicker text-[var(--ink-3)]">Your plan</span>
                    ) : (
                      <Link
                        href="/sign-up"
                        className={p.monthly === 0 ? 'btn-ghost !px-5 !py-2.5 !text-[0.6875rem]' : 'btn-lime !px-5 !py-2.5 !text-[0.6875rem]'}
                      >
                        {p.monthly === 0 ? 'Start free' : `Choose ${p.name}`}
                        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ══ Comparison table ════════════════════════════════════════════ */}
      <section className="relative z-10 border-t border-[var(--rule-strong)] bg-[var(--paper-2)] px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1200px]">
          <motion.div {...reveal()} className="mb-12 lg:max-w-md">
            <p className="kicker text-[var(--ink-3)]">Line by line</p>
            <h2 className="display mt-5 text-[2.5rem] leading-[0.94] sm:text-[3rem]">
              Compare<br /><span className="display-i">every plan.</span>
            </h2>
          </motion.div>

          {/* Below sm the four-column grid can't hold its shape, so the same
              data restacks into one ruled block per plan rather than forcing a
              sideways scroll to compare anything. */}
          <motion.div {...reveal(1)} className="space-y-8 sm:hidden">
            {plans.map((plan, planIdx) => (
              <div key={plan.id} className="border border-[var(--ink)] bg-[var(--paper)]">
                <div className="flex items-baseline justify-between border-b border-[var(--ink)] px-4 py-3">
                  <span className="kicker">{plan.name}</span>
                  <span className="kicker text-[var(--ink-3)]">
                    {String(planIdx + 1).padStart(2, '0')}
                  </span>
                </div>
                <dl>
                  {comparison.map((row) => (
                    <div
                      key={row[0] as string}
                      className="leader border-b border-[var(--rule)] px-4 py-3 last:border-b-0"
                    >
                      <dt className="text-[var(--ink-2)]">{row[0]}</dt>
                      <dd><Cell v={row[planIdx + 1]} /></dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </motion.div>

          <motion.div
            {...reveal(1)}
            className="hidden border border-[var(--ink)] bg-[var(--paper)] sm:block"
          >
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--ink)]">
                  <th className="p-4 text-left font-normal">
                    <span className="kicker text-[var(--ink-3)]">Feature</span>
                  </th>
                  {plans.map((p) => (
                    <th key={p.id} className="p-4 text-center font-normal">
                      <span className="kicker">{p.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.map(([feature, f, p, h]) => (
                  <tr key={feature as string} className="border-b border-[var(--rule)] last:border-b-0">
                    <td className="p-4 text-[var(--ink-2)]">{feature}</td>
                    <td className="p-4 text-center"><Cell v={f} /></td>
                    <td className="p-4 text-center"><Cell v={p} /></td>
                    <td className="p-4 text-center"><Cell v={h} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* ══ Pricing FAQ ═════════════════════════════════════════════════ */}
      <section className="relative z-10 border-t border-[var(--rule-strong)] px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-12">
          <motion.div {...reveal()} className="lg:col-span-4">
            <p className="kicker text-[var(--ink-3)]">Queries</p>
            <h2 className="display mt-5 text-[2.75rem] leading-[0.94]">
              Billing<br /><span className="display-i">explained.</span>
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

      {/* ══ Closing CTA ═════════════════════════════════════════════════ */}
      <section className="relative z-10 bg-[var(--ink)] px-5 py-24 text-center text-[var(--paper)] sm:px-8">
        <motion.div {...reveal()} className="mx-auto max-w-xl">
          <p className="kicker text-[var(--lime)]">Open an account</p>
          <h2 className="display mt-6 text-[2.5rem] leading-[0.94] sm:text-[3.25rem]">
            Start free.<br /><span className="display-i text-[var(--lime)]">Upgrade later.</span>
          </h2>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link href="/sign-up" className="btn-lime">
              Start for free <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
