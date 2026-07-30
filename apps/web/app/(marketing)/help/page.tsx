'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calculator, CreditCard, FileUp, Goal, Landmark, PiggyBank, Receipt, Search, Wallet } from 'lucide-react'

const topics = [
  { icon: Receipt, title: 'Transactions', desc: 'Adding, editing, splitting, and importing transactions.' },
  { icon: Wallet, title: 'Budgets', desc: 'Monthly budgets, rollover, and money left to assign.' },
  { icon: FileUp, title: 'CSV import', desc: 'Column mapping, duplicates, and error reports.' },
  { icon: Calculator, title: 'Loan calculators', desc: 'Car loans, extra payments, and amortization.' },
  { icon: CreditCard, title: 'Debt payoff', desc: 'Snowball vs. avalanche and saved plans.' },
  { icon: PiggyBank, title: 'Goals', desc: 'Savings targets, contributions, and milestones.' },
  { icon: Landmark, title: 'Accounts', desc: 'Balances, net-worth inclusion, and archiving.' },
  { icon: Goal, title: 'Bills & reminders', desc: 'Recurrence, autopay, and the payment calendar.' },
]

const articles: [string, string, string][] = [
  ['Getting started', 'How do I set up Pennyward for the first time?', 'Create an account, complete the seven-step onboarding (goals, preferences, accounts, data, debts, budget), and your dashboard fills in automatically. You can also load sample data to explore first.'],
  ['CSV import', 'Which CSV formats are supported?', 'Any CSV with a date column and either a signed amount column or separate debit/credit columns. You map the columns yourself, so almost every bank export works.'],
  ['CSV import', 'How does duplicate detection work?', 'Pennyward compares account, date, amount, and merchant text. Likely duplicates are shown for review — you can skip them, import them anyway, or inspect each one.'],
  ['Budgets', 'What does “money left to assign” mean?', 'It is your expected monthly income minus the amounts budgeted across categories and your savings target. When it reaches zero, every dollar has a job.'],
  ['Loans', 'How are extra payments applied?', 'Extra monthly payments go entirely to principal. Pennyward recalculates the schedule, showing interest saved and how many months earlier you will pay the loan off.'],
  ['Debt payoff', 'Snowball or avalanche — which should I pick?', 'Avalanche minimizes interest by attacking the highest APR first. Snowball pays the smallest balance first for quicker wins. The planner shows both side by side so you can compare real dates and dollars.'],
  ['Accounts', 'Can I exclude an account from net worth?', 'Yes. Open the account menu and toggle “Include in net worth.” The balance still appears on the Accounts page.'],
  ['Data', 'Where is my data stored in this demo?', 'Everything is stored in your browser’s local storage. Use Settings → Data to export a JSON backup, restore it, or reset to sample data.'],
]

export default function Help() {
  const [query, setQuery] = useState('')
  const filtered = articles.filter(([t, q, a]) =>
    `${t} ${q} ${a}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-[1100px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.3, 1] }}
        >
          <div className="kicker flex items-center gap-3 text-[var(--ink-3)]">
            <span className="inline-block h-px w-10 bg-[var(--rust)]" />
            Help center
          </div>
          <h1 className="display mt-6 text-[2.75rem] leading-[0.96] sm:text-[3.75rem]">
            Guides &amp; <span className="display-i">answers.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--ink-2)]">
            Every part of Pennyward, indexed.
          </p>

          <div className="relative mt-9 max-w-lg border-b border-[var(--rule-strong)] focus-within:border-[var(--ink)]">
            <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-3)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search help articles…"
              className="fig w-full border-0 bg-transparent py-3 pl-7 text-[0.9375rem] outline-none placeholder:text-[var(--ink-3)]"
            />
          </div>
        </motion.div>

        {!query && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-70px' }}
            transition={{ duration: 0.5 }}
            className="mt-14 grid gap-x-8 border-t border-[var(--rule-strong)] sm:grid-cols-2 lg:grid-cols-4"
          >
            {topics.map((t, i) => (
              <div
                key={t.title}
                className={`border-b border-[var(--rule)] py-6 pr-4 ${i % 2 === 0 ? 'sm:border-r sm:border-[var(--rule)] sm:pr-8' : 'sm:pl-8'} ${i % 4 !== 0 ? 'lg:border-l lg:border-[var(--rule)] lg:pl-8' : ''}`}
              >
                <t.icon className="h-4 w-4 text-[var(--rust)]" strokeWidth={2} />
                <h2 className="display mt-3 text-[1.25rem] leading-tight">{t.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-3)]">{t.desc}</p>
              </div>
            ))}
          </motion.div>
        )}

        <div className="mt-16">
          <p className="kicker text-[var(--ink-3)]">
            {query ? `Results for "${query}"` : 'Popular articles'}
          </p>
          {filtered.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--ink-2)]">
              No articles matched. Try a different search, or{' '}
              <Link href="/contact" className="border-b border-[var(--ink)] text-[var(--ink)] hover:border-[var(--rust)] hover:text-[var(--rust)]">
                contact us
              </Link>.
            </p>
          ) : (
            <div className="mt-4 border-b border-[var(--rule)]">
              {filtered.map(([topic, q, a], i) => (
                <details key={`${topic}-${i}`} className="faq-item group">
                  <summary>
                    <span className="fig text-sm text-[var(--ink-3)]">{String(i + 1).padStart(2, '0')}</span>
                    <span className="flex-1">
                      <span className="kicker mr-3 text-[var(--rust)]">{topic}</span>
                      <span className="faq-q display text-[1.25rem] leading-snug transition-colors sm:text-[1.375rem]">
                        {q}
                      </span>
                    </span>
                  </summary>
                  <p className="faq-answer max-w-2xl pb-6 pl-[2.4rem] text-[0.9375rem] leading-relaxed text-[var(--ink-2)]">
                    {a}
                  </p>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
