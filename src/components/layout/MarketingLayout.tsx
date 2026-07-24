import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { Github, Linkedin, Menu, Twitter } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const links = [
  { to: '/features', label: 'Features' },
  { to: '/features#debt-payoff', label: 'Debt Payoff' },
  { to: '/app/loans/car-calculator', label: 'Loan Calculator' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/security', label: 'Security' },
]

export function MarketingNav() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" aria-label="FinPilot home"><Logo /></Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {links.map((l) => (
            <NavLink
              key={l.label}
              to={l.to}
              className={({ isActive }) => cn(
                'rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                isActive && l.to === '/features' && 'text-foreground',
              )}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/sign-up">Start for free</Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader><SheetTitle><Logo /></SheetTitle></SheetHeader>
              <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile">
                {links.map((l) => (
                  <Link key={l.label} to={l.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted">
                    {l.label}
                  </Link>
                ))}
                <Link to="/sign-in" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted">Sign in</Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

export function MarketingFooter() {
  const cols = [
    { title: 'Product', links: [['Features', '/features'], ['Pricing', '/pricing'], ['Security', '/security'], ['Car-loan calculator', '/app/loans/car-calculator'], ['Debt payoff', '/features#debt-payoff']] },
    { title: 'Company', links: [['About', '/about'], ['Contact', '/contact'], ['Help center', '/help']] },
    { title: 'Legal', links: [['Privacy policy', '/privacy'], ['Terms of service', '/terms']] },
    { title: 'Support', links: [['Help center', '/help'], ['Contact us', '/contact'], ['Security', '/security']] },
  ] as const
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-1">
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground">Know where your money goes. Build a plan for where it should go next.</p>
            <div className="mt-4 flex gap-2 text-muted-foreground">
              <a href="#" aria-label="Twitter" className="rounded-lg p-2 hover:bg-muted hover:text-foreground"><Twitter className="h-4 w-4" /></a>
              <a href="#" aria-label="GitHub" className="rounded-lg p-2 hover:bg-muted hover:text-foreground"><Github className="h-4 w-4" /></a>
              <a href="#" aria-label="LinkedIn" className="rounded-lg p-2 hover:bg-muted hover:text-foreground"><Linkedin className="h-4 w-4" /></a>
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h3 className="text-sm font-semibold">{c.title}</h3>
              <ul className="mt-3 space-y-2">
                {c.links.map(([label, to]) => (
                  <li key={label}><Link to={to} className="text-sm text-muted-foreground hover:text-foreground">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t pt-6 text-sm text-muted-foreground">
          <p>© 2026 FinPilot. All rights reserved. FinPilot is a financial tracking and planning tool — not a financial advisor.</p>
        </div>
      </div>
    </footer>
  )
}

export default function MarketingLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingNav />
      <main className="flex-1"><Outlet /></main>
      <MarketingFooter />
    </div>
  )
}
