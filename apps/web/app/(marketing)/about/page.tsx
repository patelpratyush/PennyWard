'use client'
import { motion } from 'framer-motion'
import { Compass, HeartHandshake, LineChart, type LucideIcon } from 'lucide-react'

const values: [LucideIcon, string, string][] = [
  [Compass, 'Clarity first', 'Every screen answers a real question in plain language.'],
  [LineChart, 'Honest math', 'Standard amortization, transparent assumptions, no hidden optimism.'],
  [HeartHandshake, 'On your side', 'Subscriptions, not data sales. Export and delete anytime.'],
]

export default function About() {
  return (
    <div className="px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-[1000px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.3, 1] }}
        >
          <div className="kicker flex items-center gap-3 text-[var(--ink-3)]">
            <span className="inline-block h-px w-10 bg-[var(--rust)]" />
            Masthead
          </div>
          <h1 className="display mt-6 max-w-2xl text-[2.75rem] leading-[0.96] sm:text-[3.75rem]">
            About <span className="display-i">Pennyward.</span>
          </h1>
          <p className="mt-7 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--ink-2)]">
            Most people don&rsquo;t need more financial noise. They need a clear answer to simple
            questions: where did the money go, and what should happen next?
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-70px' }}
          transition={{ duration: 0.5 }}
          className="mt-14 grid gap-10 border-t border-[var(--rule-strong)] pt-10 lg:grid-cols-12"
        >
          <p className="kicker text-[var(--ink-3)] lg:col-span-3">The origin story</p>
          <div className="max-w-2xl space-y-6 leading-relaxed text-[var(--ink-2)] lg:col-span-9">
            <p>
              Pennyward started with a spreadsheet — the kind people build when a car loan, a
              student loan, and a credit card all compete for the same paycheck. The spreadsheet
              worked, but it was fragile and joyless. Pennyward is that spreadsheet, rebuilt as a
              calm, trustworthy product.
            </p>
            <p>
              We focus on the unglamorous math that actually changes outcomes: the true cost of
              financing a vehicle, the month a debt finally hits zero, the difference an extra
              $100 makes. No trading games, no hype — just clear numbers and plans you can follow.
            </p>
          </div>
        </motion.div>

        <div className="mt-16 border-t border-[var(--rule)]">
          {values.map(([Icon, title, text], i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-70px' }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="index-row group"
            >
              <span className="fig pt-1 text-sm text-[var(--ink-3)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="flex items-start gap-4">
                <Icon className="mt-1 h-4 w-4 shrink-0 text-[var(--rust)]" strokeWidth={2} />
                <span>
                  <span className="display block text-[1.5rem] leading-tight sm:text-[1.75rem]">
                    {title}
                  </span>
                  <span className="index-blurb mt-1.5 block max-w-lg text-sm leading-relaxed">
                    {text}
                  </span>
                </span>
              </span>
            </motion.div>
          ))}
        </div>

        <p className="kicker mt-16 border-t border-[var(--rule-strong)] pt-6 text-center text-[0.625rem] text-[var(--ink-3)]">
          Pennyward is a fictional product demo built to showcase a complete personal-finance
          frontend.
        </p>
      </div>
    </div>
  )
}
