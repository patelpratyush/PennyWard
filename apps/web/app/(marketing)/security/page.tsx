'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight, Download, Eye, KeyRound, Lock, ServerCog, ShieldCheck, Trash2, UserCheck, type LucideIcon } from 'lucide-react'

const items: [LucideIcon, string, string][] = [
  [Lock, 'Encryption in transit', 'All production traffic is encrypted with TLS 1.2+. Sensitive fields are encrypted at rest in PostgreSQL.'],
  [Eye, 'Read-only bank connections', 'Bank connections (via Plaid, on the roadmap) are strictly read-only. Pennyward can never initiate transfers or payments.'],
  [ShieldCheck, 'No data selling, ever', 'We do not sell, rent, or share personal financial data with advertisers. Revenue comes from subscriptions.'],
  [KeyRound, 'Modern authentication', 'Passwords are hashed with modern algorithms. Two-factor authentication and passkeys are on the roadmap.'],
  [UserCheck, 'Session controls', 'View active sessions, sign out other devices, and revoke access from Settings → Security.'],
  [Download, 'Your data is portable', 'Export everything — transactions, budgets, plans — as CSV or JSON at any time. No lock-in.'],
  [Trash2, 'Real deletion', 'Deleting your account removes your data from our systems. Exports are available before you go.'],
  [ServerCog, 'Responsible infrastructure', 'Least-privilege access, audited dependencies, and a responsible-disclosure policy for researchers.'],
]

export default function Security() {
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
            Plainly accounted
          </div>
          <h1 className="display mt-6 text-[2.75rem] leading-[0.96] sm:text-[3.75rem]">
            Security at <span className="display-i">Pennyward.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--ink-2)]">
            Financial data deserves restraint. Pennyward is built to know as little about you as
            possible — and to protect what it does know.
          </p>
        </motion.div>

        <div className="mt-16 grid border-t border-[var(--rule-strong)] sm:grid-cols-2">
          {items.map(([Icon, title, text], i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-70px' }}
              transition={{ duration: 0.5, delay: (i % 2) * 0.07 }}
              className={`flex gap-4 border-b border-[var(--rule)] py-7 pr-4 ${i % 2 === 0 ? 'sm:border-r sm:border-[var(--rule)] sm:pr-8' : 'sm:pl-8'}`}
            >
              <span className="fig pt-1 text-sm text-[var(--ink-3)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-[var(--rust)]" strokeWidth={2} />
                  <h2 className="display text-[1.375rem] leading-tight">{title}</h2>
                </div>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--ink-2)]">{text}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-70px' }}
          transition={{ duration: 0.5 }}
          className="mt-16 border border-[var(--ink)] bg-[var(--paper-2)] p-7 sm:p-9"
        >
          <p className="kicker text-[var(--rust)]">About this demo</p>
          <p className="mt-4 max-w-2xl leading-relaxed text-[var(--ink-2)]">
            The version you are exploring stores all data locally in your browser — nothing
            leaves your device. The security practices above describe the production
            architecture Pennyward is designed for, including the planned FastAPI + PostgreSQL
            backend and read-only Plaid connections.
          </p>
          <p className="mt-3 max-w-2xl leading-relaxed text-[var(--ink-2)]">
            Found a vulnerability? Email{' '}
            <span className="fig font-semibold text-[var(--ink)]">security@pennyward.example</span>{' '}
            — we follow coordinated disclosure.
          </p>
          <Link href="/privacy" className="btn-ink mt-7">
            Read the privacy policy <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
