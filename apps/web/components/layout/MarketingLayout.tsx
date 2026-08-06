'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, Github, Linkedin, Menu, Twitter, X } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'
import '@/app/ledger.css'

const links = [
  { to: '/features', label: 'Features' },
  { to: '/features#debt-payoff', label: 'Debt Payoff' },
  { to: '/app/loans/car-calculator', label: 'Loan Calculator' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/security', label: 'Security' },
]

export function MarketingNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--rule-strong)] bg-[var(--paper)]/92 backdrop-blur-[6px]">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-8 px-5 sm:px-8">
        <Link href="/" aria-label="Pennyward home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.to}
              className={`kicker text-[var(--ink-3)] transition-colors hover:text-[var(--ink)] ${
                pathname === l.to.split('#')[0] && l.to === '/features' ? 'text-[var(--ink)]' : ''
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/sign-in"
            className="kicker hidden text-[var(--ink-3)] transition-colors hover:text-[var(--ink)] sm:block"
          >
            Sign in
          </Link>
          <Link href="/sign-up" className="btn-lime !px-5 !py-2.5 !text-[0.6875rem]">
            Start free
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex h-9 w-9 items-center justify-center border border-[var(--ink)] md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          aria-label="Mobile"
          className="border-t border-[var(--rule-strong)] bg-[var(--paper)] px-5 py-5 md:hidden"
        >
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.label} className="border-b border-[var(--rule)]">
                <Link
                  href={l.to}
                  onClick={() => setOpen(false)}
                  className="kicker flex items-center justify-between py-3.5 text-[var(--ink-2)]"
                >
                  {l.label}
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                </Link>
              </li>
            ))}
            <li className="border-b border-[var(--rule)]">
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="kicker flex items-center justify-between py-3.5 text-[var(--ink-2)]"
              >
                Sign in
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}

export function MarketingFooter() {
  const cols: [string, [string, string][]][] = [
    [
      'Product',
      [
        ['Features', '/features'],
        ['Pricing', '/pricing'],
        ['Security', '/security'],
        ['Car-loan calculator', '/app/loans/car-calculator'],
        ['Debt payoff', '/features#debt-payoff'],
      ],
    ],
    ['Company', [['About', '/about'], ['Contact', '/contact'], ['Help center', '/help']]],
    ['Legal', [['Privacy', '/privacy'], ['Terms', '/terms']]],
  ]
  return (
    <footer className="bg-[var(--ink)] px-5 pb-12 text-[var(--paper-3)] sm:px-8">
      <div className="mx-auto max-w-[1400px] border-t border-[var(--ink-2)] pt-12">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo className="text-[var(--paper)] [&>span:first-child]:border-[var(--paper)] [&>span:first-child]:bg-[var(--paper)] [&>span:first-child]:text-[var(--ink)]" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed">
              Know where your money goes. Then decide where it goes next.
            </p>
            <div className="mt-5 flex gap-2">
              <a href="#" aria-label="Twitter" className="border border-[var(--ink-2)] p-2 transition-colors hover:border-[var(--lime)] hover:text-[var(--lime)]">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" aria-label="GitHub" className="border border-[var(--ink-2)] p-2 transition-colors hover:border-[var(--lime)] hover:text-[var(--lime)]">
                <Github className="h-4 w-4" />
              </a>
              <a href="#" aria-label="LinkedIn" className="border border-[var(--ink-2)] p-2 transition-colors hover:border-[var(--lime)] hover:text-[var(--lime)]">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>
          {cols.map(([title, colLinks]) => (
            <div key={title} className="md:col-span-2">
              <p className="kicker text-[var(--paper)]">{title}</p>
              <ul className="mt-4 space-y-2.5">
                {colLinks.map(([label, to]) => (
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
              <li>
                <Link href="/sign-in" className="text-sm transition-colors hover:text-[var(--lime)]">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/sign-up" className="text-sm transition-colors hover:text-[var(--lime)]">
                  Start free
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--ink-2)] pt-6">
          <p className="kicker text-[0.625rem]">© 2026 Pennyward · All rights reserved</p>
          <p className="kicker text-[0.625rem] text-[var(--ink-3)]">
            A tracking &amp; planning tool — not a financial advisor
          </p>
        </div>
        <p className="mt-4 text-xs text-[var(--ink-3)]">
          Your data is yours; we never sell it.
        </p>
      </div>
    </footer>
  )
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ledger flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  )
}
