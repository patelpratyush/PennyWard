'use client'
import type { ReactNode } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Logo } from '@/components/shared/Logo'
import { createClient } from '@/lib/supabase/client'
import '@/app/ledger.css'

// R1.1: real Google OAuth via Supabase Auth. Requires the Google provider to
// be enabled in the Supabase dashboard (Authentication → Providers) with a
// Google Cloud OAuth client id/secret — until that's configured, Supabase
// returns an error which this surfaces as a toast rather than a dead click.
export function GoogleButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false)

  const signInWithGoogle = async () => {
    setLoading(true)
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      toast.error('Google sign-in is not available yet.')
      setLoading(false)
    }
    // On success the browser is redirected to Google, so no further local
    // state change is needed here.
  }

  return (
    <button
      type="button"
      disabled={loading}
      aria-label={`${label} with Google`}
      onClick={signInWithGoogle}
      className="flex h-12 w-full items-center justify-center gap-2.5 border border-[var(--ink)] bg-[var(--paper)] px-4 font-mono text-[0.75rem] font-medium uppercase tracking-[0.12em] text-[var(--ink)] transition-opacity hover:opacity-80 disabled:cursor-wait disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
        <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.2 3.7-8.6z"/>
        <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.8-5.1L1.3 17.2C3.3 21.3 7.3 24 12 24z"/>
        <path fill="#FBBC05" d="M5.2 14.3c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.3 6.8C.5 8.4 0 10.1 0 12s.5 3.6 1.3 5.2l3.9-2.9z"/>
        <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.3 0 3.3 2.7 1.3 6.8l3.9 2.9c.9-2.9 3.6-5 6.8-5z"/>
      </svg>
      <span>{loading ? 'Redirecting…' : `${label} with Google`}</span>
    </button>
  )
}

export default function AuthShell({ title, subtitle, children, footer }: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="ledger ledger-grain relative flex min-h-screen flex-col overflow-hidden">
      <div className="ledger-rules pointer-events-none absolute inset-0 opacity-40" aria-hidden />

      <header className="relative z-10 flex h-16 items-center border-b border-[var(--rule-strong)] px-5 sm:px-8">
        <Link href="/" aria-label="Back to home" className="transition-opacity hover:opacity-70">
          <Logo />
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-14 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0.8, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="relative border border-[var(--ink)] bg-[var(--paper-2)] p-7 shadow-[6px_6px_0_0_var(--ink)] sm:p-9">
            <div className="flex items-baseline justify-between border-b border-dashed border-[var(--rule-strong)] pb-4">
              <span className="kicker text-[var(--ink-3)]">Account access</span>
              <span className="kicker text-[var(--ink-3)]">Pennyward</span>
            </div>

            <h1 className="display mt-6 text-[2rem] leading-[0.98] sm:text-[2.25rem]">{title}</h1>
            {subtitle && (
              <p className="mt-2.5 text-sm leading-relaxed text-[var(--ink-2)]">{subtitle}</p>
            )}

            <div className="mt-7">{children}</div>
          </div>

          {footer && (
            <div className="mt-6 text-center text-sm text-[var(--ink-2)]">{footer}</div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
