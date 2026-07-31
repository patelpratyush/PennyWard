'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Bell, Calculator, Car, ChevronRight, CreditCard, FileBarChart, Goal,
  Home, Landmark, LineChart, ListOrdered, LogOut, Menu, Moon, Plus,
  Receipt, Search, Settings, Sun, SunMoon, Upload, User, Wallet, X,
} from 'lucide-react'
import { useStore } from '@/stores/useStore'
import { useAccounts } from '@/hooks/queries/useAccounts'
import { useTransactions } from '@/hooks/queries/useTransactions'
import { useDebts } from '@/hooks/queries/useDebts'
import { useCategories } from '@/hooks/queries/useCategories'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'
import { allTickers } from '@/services/stocks'

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: Home },
  { to: '/app/transactions', label: 'Transactions', icon: Receipt },
  { to: '/app/budgets', label: 'Budgets', icon: Wallet },
  { to: '/app/accounts', label: 'Accounts', icon: Landmark },
  { to: '/app/debt', label: 'Debt & Loans', icon: CreditCard },
  { to: '/app/goals', label: 'Goals', icon: Goal },
  { to: '/app/bills', label: 'Bills & Calendar', icon: ListOrdered },
  { to: '/app/stocks', label: 'Stocks', icon: LineChart },
  { to: '/app/reports', label: 'Reports', icon: FileBarChart },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
  { to: '/app/settings/profile', label: 'Settings', icon: Settings },
]

const bottomNav = [
  { to: '/app/dashboard', label: 'Home', icon: Home },
  { to: '/app/transactions', label: 'Activity', icon: Receipt },
  { to: '/app/budgets', label: 'Budgets', icon: Wallet },
  { to: '/app/debt', label: 'Debt', icon: CreditCard },
  { to: '/app/settings/profile', label: 'More', icon: Settings },
]

const quickAdd = [
  { label: 'Add transaction', to: '/app/transactions?add=1', icon: Receipt },
  { label: 'Add account', to: '/app/accounts?add=1', icon: Landmark },
  { label: 'Add debt', to: '/app/debt?add=1', icon: CreditCard },
  { label: 'Add bill', to: '/app/bills?add=1', icon: ListOrdered },
  { label: 'Add savings goal', to: '/app/goals?add=1', icon: Goal },
  { label: 'Calculate loan', to: '/app/loans/car-calculator', icon: Calculator },
  { label: 'Car calculator', to: '/app/loans/car-calculator', icon: Car },
  { label: 'Import CSV', to: '/app/transactions/import', icon: Upload },
]

function ThemeToggle() {
  const theme = useStore((s) => s.settings.theme)
  const updateSettings = useStore((s) => s.updateSettings)
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : SunMoon
  return (
    <Button
      variant="ghost" size="icon" className="h-9 w-9"
      aria-label={`Theme: ${theme}. Switch to ${next}.`}
      onClick={() => updateSettings({ theme: next })}
    >
      <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
    </Button>
  )
}

function NotificationsMenu() {
  const router = useRouter()
  const notifications = useStore((s) => s.notifications)
  const markAll = useStore((s) => s.markAllNotificationsRead)
  const unread = notifications.filter((n) => !n.read).length
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label={`Notifications, ${unread} unread`}>
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="kicker flex items-center justify-between text-muted-foreground">
          Notifications
          {unread > 0 && (
            <button className="font-mono text-[10px] font-medium normal-case tracking-normal text-primary hover:underline" onClick={markAll}>
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.slice(0, 5).map((n) => (
          <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2" onClick={() => router.push('/app/notifications')}>
            <span className="flex w-full items-center gap-2 text-sm font-medium">
              {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              {n.title}
            </span>
            <span className="line-clamp-2 text-xs text-muted-foreground">{n.message}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-sm font-medium text-primary" onClick={() => router.push('/app/notifications')}>
          View all
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function GlobalSearch({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const router = useRouter()
  // Goals and bills are out of migration scope for this plan and stay on the
  // legacy store. Accounts, transactions, categories, and debts are migrated
  // entities, so the search index must be built from the real API data —
  // otherwise Cmd-K surfaces sample/demo entities that don't match what the
  // rest of the app shows. This is a quick-search assist, not an aggregate
  // calculation, so a reasonably-sized recent page (not an exhaustive fetch)
  // is appropriate for transactions.
  const { goals, bills } = useStore()
  const { data: accounts = [] } = useAccounts()
  const { data: transactionsPage } = useTransactions({ pageSize: 50 })
  const transactions = transactionsPage?.items ?? []
  const { data: debts = [] } = useDebts()
  const { data: categories = [] } = useCategories()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  const pages = useMemo(() => [
    ...navItems.map((n) => ({ label: n.label, to: n.to, group: 'Pages' })),
    { label: 'Car-loan calculator', to: '/app/loans/car-calculator', group: 'Pages' },
    { label: 'Loan calculator', to: '/app/loans/calculator', group: 'Pages' },
    { label: 'Debt payoff planner', to: '/app/debt/payoff-planner', group: 'Pages' },
    { label: 'Scenario comparison', to: '/app/loans/scenarios', group: 'Pages' },
    { label: 'Import CSV', to: '/app/transactions/import', group: 'Pages' },
  ], [])

  const go = (to: string) => {
    setOpen(false)
    router.push(to)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search transactions, accounts, goals, stocks…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {pages.map((p) => (
            <CommandItem key={p.to + p.label} onSelect={() => go(p.to)}>
              <ChevronRight className="mr-2 h-4 w-4 text-muted-foreground" />{p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Transactions">
          {transactions.slice(0, 30).map((t) => (
            <CommandItem key={t.id} keywords={[t.merchant]} onSelect={() => go('/app/transactions')}>
              <Receipt className="mr-2 h-4 w-4 text-muted-foreground" />
              {t.merchant}
              <span className="ml-auto text-xs text-muted-foreground">{formatDate(t.date, 'MMM d')}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Accounts">
          {accounts.map((a) => (
            <CommandItem key={a.id} keywords={[a.name, a.institution]} onSelect={() => go(`/app/accounts/${a.id}`)}>
              <Landmark className="mr-2 h-4 w-4 text-muted-foreground" />{a.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Debts & Goals & Bills">
          {debts.map((d) => (
            <CommandItem key={d.id} keywords={[d.name, d.lender]} onSelect={() => go('/app/debt')}>
              <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />{d.name}
            </CommandItem>
          ))}
          {goals.map((g) => (
            <CommandItem key={g.id} keywords={[g.name]} onSelect={() => go(`/app/goals/${g.id}`)}>
              <Goal className="mr-2 h-4 w-4 text-muted-foreground" />{g.name}
            </CommandItem>
          ))}
          {bills.map((b) => (
            <CommandItem key={b.id} keywords={[b.name]} onSelect={() => go('/app/bills')}>
              <ListOrdered className="mr-2 h-4 w-4 text-muted-foreground" />{b.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Stocks">
          {allTickers().map((t) => (
            <CommandItem key={t} keywords={[t]} onSelect={() => go(`/app/stocks/${t}`)}>
              <LineChart className="mr-2 h-4 w-4 text-muted-foreground" />{t}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Categories">
          {categories.filter((c) => !c.archived).map((c) => (
            <CommandItem key={c.id} keywords={[c.name]} onSelect={() => go('/app/settings/categories')}>
              <Search className="mr-2 h-4 w-4 text-muted-foreground" />{c.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

function SidebarContent({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 items-center border-b px-4', collapsed && 'justify-center px-2')}>
        <Link href="/" onClick={onNavigate} aria-label="Pennyward home">
          <Logo markOnly={collapsed} />
        </Link>
      </div>
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-0.5" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`)
            return (
              <Link
                key={item.to}
                href={item.to}
                onClick={onNavigate}
                className={cn(
                  'flex h-10 items-center gap-3 border-l-2 border-transparent px-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                  isActive && 'border-l-[var(--lime-deep)] bg-sidebar-accent text-sidebar-accent-foreground',
                  collapsed && 'justify-center border-l-0 px-0',
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && item.label}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
      {!collapsed && (
        <div className="border-t border-border p-4">
          <div className="border border-border bg-card p-3">
            <p className="kicker text-[var(--rust)]">Pro plan</p>
            <p className="mt-1.5 text-xs text-muted-foreground">CSV imports, unlimited budgets &amp; scenarios.</p>
            <Button asChild size="sm" variant="outline" className="mt-2.5 h-8 w-full font-mono text-[11px] uppercase tracking-wide">
              <Link href="/app/settings/subscription">Manage plan</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const profile = useStore((s) => s.profile)
  const density = useStore((s) => s.settings.density)

  const crumbs = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean).slice(1)
    return parts.map((p) => p.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
  }, [pathname])

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 hidden border-r bg-sidebar transition-[width] duration-200 lg:block',
        collapsed ? 'w-[68px]' : 'w-64',
      )}>
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only"><SheetTitle>Navigation</SheetTitle></SheetHeader>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className={cn('flex min-h-screen flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-[68px]' : 'lg:pl-64')}>
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur sm:px-5">
          <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="hidden h-9 w-9 lg:inline-flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-4 w-4 rotate-45" />}
          </Button>

          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="kicker hidden items-center gap-1.5 text-muted-foreground md:flex">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-[var(--rule-strong)]">/</span>}
                <span className={cn(i === crumbs.length - 1 && 'text-foreground')}>{c}</span>
              </span>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden h-9 items-center gap-2 border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:bg-muted sm:flex sm:w-52 lg:w-64"
              aria-label="Open global search"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search…</span>
              <kbd className="border border-border bg-background px-1.5 font-mono text-[10px] font-semibold">⌘K</kbd>
            </button>
            <Button variant="ghost" size="icon" className="h-9 w-9 sm:hidden" aria-label="Search" onClick={() => setSearchOpen(true)}>
              <Search className="h-5 w-5" />
            </Button>

            {/* Quick add */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-9 gap-1.5">
                  <Plus className="h-4 w-4" /><span className="hidden sm:inline">Add</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="kicker text-muted-foreground">Quick add</DropdownMenuLabel>
                {quickAdd.map((q) => (
                  <DropdownMenuItem key={q.label} onClick={() => router.push(q.to)}>
                    <q.icon className="mr-2 h-4 w-4 text-muted-foreground" />{q.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <NotificationsMenu />
            <ThemeToggle />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 px-2" aria-label="User menu">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary text-[11px] font-bold text-primary-foreground">PP</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium md:inline">{profile.preferredName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-semibold">{profile.fullName}</p>
                  <p className="mt-0.5 font-mono text-xs font-normal text-muted-foreground">{profile.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/app/settings/profile')}><User className="mr-2 h-4 w-4" />Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/app/settings/subscription')}>
                  <Badge variant="secondary" className="mr-2 font-mono text-[10px] uppercase tracking-wide">Pro</Badge>Subscription
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await createClient().auth.signOut(); router.push('/'); router.refresh() }}>
                  <LogOut className="mr-2 h-4 w-4" />Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className={cn('mx-auto w-full max-w-[1400px] flex-1 px-3 pb-24 pt-6 sm:px-5 lg:pb-10', density === 'compact' ? 'space-y-3' : '')}>
          <div key={pathname} className="page-enter">
            {children}
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-border bg-background/95 backdrop-blur lg:hidden" aria-label="Mobile navigation">
          {bottomNav.map((item) => {
            const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`)
            return (
              <Link
                key={item.to}
                href={item.to}
                className={cn(
                  'flex min-w-[44px] flex-1 flex-col items-center justify-center gap-1 border-t-2 border-transparent font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground',
                  isActive && 'border-t-[var(--lime-deep)] text-foreground',
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <GlobalSearch open={searchOpen} setOpen={setSearchOpen} />
    </div>
  )
}
