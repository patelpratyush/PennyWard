'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { addDays, format, isBefore, parseISO, subMonths } from 'date-fns'
import {
  ArrowRight, CalendarClock, Eye, EyeOff, Lightbulb, RotateCcw, Settings2,
} from 'lucide-react'
import { useStore } from '@/stores/useStore'
import { useAccounts } from '@/hooks/queries/useAccounts'
import { useTransactions } from '@/hooks/queries/useTransactions'
import { useCategories } from '@/hooks/queries/useCategories'
import { useBudget } from '@/hooks/queries/useBudgets'
import { useDebts } from '@/hooks/queries/useDebts'
import { MetricCard } from '@/components/shared/MetricCard'
import { ChartCard, StatusBadge } from '@/components/shared/Misc'
import { Money } from '@/components/shared/Money'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { EmptyState, LoadingSkeleton } from '@/components/shared/States'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { budgetStatus, budgetTotals, goalMath, netWorth, spendingByCategory } from '@/lib/finance/budget'
import { categoryTotals, monthlySummaries, totalsForMonth } from '@/lib/finance/derive'
import { compareStrategies } from '@/lib/finance/debt'
import { formatCurrency, formatDate, formatMonth, round2 } from '@/lib/format'
import { getQuote } from '@/services/stocks'
import { cn } from '@/lib/utils'

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-6))', 'hsl(var(--chart-7))', 'hsl(var(--chart-8))']

function CurrencyTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 tnum">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: {formatCurrency(p.value, { decimals: 0 })}
        </p>
      ))}
    </div>
  )
}

export function Sparkline({ data, color = 'hsl(var(--chart-1))' }: { data: number[]; color?: string }) {
  const points = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <Area type="monotone" dataKey="v" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

const widgetLabels: Record<string, string> = {
  summary: 'Summary cards', cashflow: 'Cash-flow chart', categories: 'Spending by category',
  budget: 'Budget progress', debt: 'Debt payoff', bills: 'Upcoming bills',
  goals: 'Savings goals', transactions: 'Recent transactions', insights: 'Financial insights', stocks: 'Stock snapshot',
}

export default function Dashboard() {
  // Entities covered by this migration plan (accounts, transactions, budgets, debts,
  // categories) are read from the real API via React Query. Goals, bills, and
  // watchlists/stocks are out of scope for this plan and stay on the legacy store.
  const { profile, goals, bills, watchlists, dashboardWidgets, setDashboardWidgets } = useStore()
  const [range, setRange] = useState('this-month')
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')
  const [customOpen, setCustomOpen] = useState(false)

  const now = new Date()
  const monthKey = format(now, 'yyyy-MM')
  const prevMonthKey = format(addDays(new Date(now.getFullYear(), now.getMonth(), 0), 0), 'yyyy-MM')
  const sixMonthsAgo = format(subMonths(now, 5), 'yyyy-MM-01')
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'

  const accountsQ = useAccounts()
  const categoriesQ = useCategories()
  const debtsQ = useDebts()
  const budgetQ = useBudget(monthKey)
  // Last six months of activity, used for the cash-flow chart, category donut,
  // and this-month budget spend. The API caps pageSize at 200.
  const txQ = useTransactions({ from: sixMonthsAgo, pageSize: 200 })
  // Small, separately-capped query for the "recent transactions" widget.
  const recentTxQ = useTransactions({ pageSize: 5 })

  const accounts = accountsQ.data ?? []
  const categories = categoriesQ.data ?? []
  const debts = debtsQ.data ?? []
  const budget = budgetQ.data ?? null
  const transactions = txQ.data?.items ?? []
  const recentTransactions = recentTxQ.data?.items ?? []

  const isLoading = accountsQ.isLoading || categoriesQ.isLoading || debtsQ.isLoading || budgetQ.isLoading || txQ.isLoading

  const summaries = useMemo(() => monthlySummaries(transactions, 6), [transactions])
  const thisMonth = useMemo(() => totalsForMonth(transactions, monthKey), [transactions, monthKey])
  const lastMonth = useMemo(() => totalsForMonth(transactions, prevMonthKey), [transactions, prevMonthKey])
  const nw = useMemo(() => netWorth(accounts), [accounts])
  const totalDebt = useMemo(() => round2(debts.reduce((s, d) => s + d.balance, 0)), [debts])
  const cashTotal = useMemo(() => round2(accounts.filter((a) => ['checking', 'savings', 'cash'].includes(a.type) && !a.archived).reduce((s, a) => s + a.balance, 0)), [accounts])

  const spent = useMemo(() => spendingByCategory(transactions, monthKey), [transactions, monthKey])
  const bt = budget ? budgetTotals(budget, spent) : null

  const catTotals = useMemo(() => categoryTotals(transactions, monthKey), [transactions, monthKey])
  const catData = useMemo(() => {
    const rows = [...catTotals.entries()]
      .map(([id, value]) => ({ name: categories.find((c) => c.id === id)?.name ?? 'Other', value }))
      .sort((a, b) => b.value - a.value)
    const top = rows.slice(0, 6)
    const rest = rows.slice(6)
    if (rest.length) top.push({ name: 'Other', value: round2(rest.reduce((s, r) => s + r.value, 0)) })
    return top
  }, [catTotals, categories])

  const debtPlan = useMemo(
    () => (debts.length ? compareStrategies(debts, 100, 0, monthKey).avalanche : null),
    [debts, monthKey],
  )

  const upcomingBills = useMemo(() => bills
    .filter((b) => !b.isIncome)
    .map((b) => {
      const due = parseISO(b.nextDueDate)
      const paid = b.paidDates.includes(b.nextDueDate)
      const overdue = !paid && isBefore(due, now)
      const soon = !paid && !overdue && isBefore(due, addDays(now, 7))
      const status = (paid ? 'paid' : overdue ? 'overdue' : soon ? 'due' : 'upcoming') as 'paid' | 'overdue' | 'due' | 'upcoming'
      return { ...b, status }
    })
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
    .slice(0, 6), [bills, now])

  const insights = useMemo(() => {
    const list: string[] = []
    const diningNow = catTotals.get('cat_dining') ?? 0
    const prevCat = categoryTotals(transactions, prevMonthKey).get('cat_dining') ?? 0
    if (prevCat > 0) {
      const pct = Math.round(((diningNow - prevCat) / prevCat) * 100)
      if (pct !== 0) list.push(`Dining spending is ${Math.abs(pct)}% ${pct > 0 ? 'higher' : 'lower'} than last month.`)
    }
    if (bt && bt.totalBudgeted > 0) list.push(`You have used ${Math.round(bt.pctUsed)}% of your monthly budget.`)
    if (debtPlan && debtPlan.interestSaved > 0) list.push(`Paying an additional $100 toward your highest-rate debt could save approximately ${formatCurrency(debtPlan.interestSaved, { decimals: 0 })} in interest.`)
    const ef = goals.find((g) => g.type === 'emergency')
    if (ef) {
      const gm = goalMath(ef)
      if (gm.estimatedCompletion) list.push(`Your emergency fund is on track for completion around ${formatDate(gm.estimatedCompletion, 'MMMM yyyy')}.`)
    }
    return list.slice(0, 4)
  }, [catTotals, transactions, prevMonthKey, bt, debtPlan, goals])

  const stockSnapshot = useMemo(() => {
    const wl = watchlists[0]
    if (!wl) return []
    return wl.items.slice(0, 4).map((i) => getQuote(i.ticker)).filter(Boolean)
  }, [watchlists])

  const visible = (id: string) => dashboardWidgets.find((w) => w.id === id)?.visible !== false
  const pct = (nowV: number, prevV: number) => (prevV !== 0 ? ((nowV - prevV) / Math.abs(prevV)) * 100 : 0)

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{greeting}, {profile.preferredName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here is your financial overview for {formatMonth(now)}.</p>
        </div>
        <LoadingSkeleton rows={6} />
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{greeting}, {profile.preferredName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here is your financial overview for {formatMonth(now)}.</p>
        </div>
        <EmptyState
          title="Add your first account"
          description="Connect a checking, savings, or credit card account to see your net worth, budget, and spending come to life."
          actionLabel="Add account"
          actionHref="/app/accounts?add=1"
        />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greeting}, {profile.preferredName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here is your financial overview for {formatMonth(now)}.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-44" aria-label="Date range"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This month</SelectItem>
              <SelectItem value="last-month">Last month</SelectItem>
              <SelectItem value="3m">Last three months</SelectItem>
              <SelectItem value="6m">Last six months</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
              <SelectItem value="custom">Custom…</SelectItem>
            </SelectContent>
          </Select>
          <Sheet open={customOpen} onOpenChange={setCustomOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Customize dashboard"><Settings2 className="h-4 w-4" /></Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader><SheetTitle>Customize dashboard</SheetTitle></SheetHeader>
              <div className="mt-6 space-y-4">
                {dashboardWidgets.map((w) => (
                  <div key={w.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      {visible(w.id) ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      {widgetLabels[w.id] ?? w.id}
                    </span>
                    <Switch
                      checked={visible(w.id)}
                      onCheckedChange={(v) => setDashboardWidgets(dashboardWidgets.map((x) => (x.id === w.id ? { ...x, visible: v } : x)))}
                      aria-label={`Toggle ${widgetLabels[w.id] ?? w.id}`}
                    />
                  </div>
                ))}
                <Button variant="outline" className="w-full" onClick={() => setDashboardWidgets(dashboardWidgets.map((w) => ({ ...w, visible: true })))}>
                  <RotateCcw className="mr-1.5 h-4 w-4" />Restore defaults
                </Button>
                <p className="text-xs text-muted-foreground">Density (compact / comfortable) can be changed in Settings → Appearance.</p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Summary cards */}
      {visible('summary') && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Net worth" value={nw.netWorth} changePct={2.4} comparison="vs last month" href="/app/accounts"
            tooltip="Included assets minus liabilities." sparkline={<Sparkline data={[-14200, -13100, -12400, -11300, -9800, nw.netWorth]} />} />
          <MetricCard label="Total cash" value={cashTotal} changePct={3.1} comparison="vs last month" href="/app/accounts"
            tooltip="Checking, savings, and cash on hand." sparkline={<Sparkline data={[22100, 22800, 23450, 24100, 24800, cashTotal]} color="hsl(var(--chart-3))" />} />
          <MetricCard label="Income" value={thisMonth.income} changePct={pct(thisMonth.income, lastMonth.income)} comparison="vs last month" href="/app/transactions"
            tooltip="All income transactions this month." sparkline={<Sparkline data={summaries.map((s) => s.income)} color="hsl(var(--chart-3))" />} />
          <MetricCard label="Spending" value={thisMonth.expenses} changePct={pct(thisMonth.expenses, lastMonth.expenses)} comparison="vs last month" href="/app/transactions" tone="negative-good"
            tooltip="All expense transactions this month (transfers excluded)." sparkline={<Sparkline data={summaries.map((s) => s.expenses)} color="hsl(var(--chart-5))" />} />
          <MetricCard label="Budget left" value={bt?.remaining ?? 0} comparison={bt ? `of ${formatCurrency(bt.totalBudgeted, { decimals: 0 })}` : 'No budget'} href="/app/budgets"
            tooltip="Budgeted minus spent this month." sparkline={<Sparkline data={[100, 84, 71, 58, 44, bt ? (bt.remaining / Math.max(1, bt.totalBudgeted)) * 100 : 0]} color="hsl(var(--chart-4))" />} />
          <MetricCard label="Total debt" value={totalDebt} changePct={-1.3} comparison="vs last month" href="/app/debt" tone="negative-good"
            tooltip="Sum of all debt balances." sparkline={<Sparkline data={[50200, 49400, 48600, 47900, 47400, totalDebt]} color="hsl(var(--chart-5))" />} />
        </div>
      )}

      {/* Cash flow + categories */}
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        {visible('cashflow') && (
          <ChartCard
            title="Cash flow" description="Income vs. expenses, last six months" className="lg:col-span-3"
            summary={`Monthly income around ${formatCurrency(thisMonth.income, { decimals: 0 })}; expenses trending down.`}
            actions={
              <Tabs value={chartType} onValueChange={(v) => setChartType(v as 'bar' | 'line')}>
                <TabsList className="h-8">
                  <TabsTrigger value="bar" className="h-7 px-2.5 text-xs">Bars</TabsTrigger>
                  <TabsTrigger value="line" className="h-7 px-2.5 text-xs">Lines</TabsTrigger>
                </TabsList>
              </Tabs>
            }
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={summaries} barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} width={40} />
                    <RTooltip content={<CurrencyTooltip />} />
                    <Bar dataKey="income" name="Income" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={summaries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} width={40} />
                    <RTooltip content={<CurrencyTooltip />} />
                    <Line type="monotone" dataKey="income" name="Income" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="net" name="Net" stroke="hsl(var(--chart-4))" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-chart-3" />Income</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-chart-1" />Expenses</span>
              {chartType === 'line' && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-chart-4" />Net cash flow</span>}
            </div>
          </ChartCard>
        )}

        {visible('categories') && (
          <ChartCard title="Spending by category" description={formatMonth(now)} className="lg:col-span-2"
            summary={catData.length ? `Largest category: ${catData[0].name} at ${formatCurrency(catData[0].value, { decimals: 0 })}.` : 'No spending yet this month.'}>
            {catData.length === 0 ? (
              <EmptyState title="No spending yet" description="Add transactions to see category breakdowns." actionLabel="Add transaction" actionHref="/app/transactions?add=1" />
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="relative h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={catData} dataKey="value" innerRadius={52} outerRadius={80} paddingAngle={2} strokeWidth={0}>
                        {catData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <RTooltip content={<CurrencyTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">Total</span>
                    <span className="text-sm font-bold tnum">{formatCurrency(thisMonth.expenses, { decimals: 0 })}</span>
                  </div>
                </div>
                <ul className="w-full space-y-1.5">
                  {catData.map((c, i) => (
                    <li key={c.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="font-semibold tnum">{formatCurrency(c.value, { decimals: 0 })}</span>
                      <span className="w-9 text-right text-muted-foreground tnum">{thisMonth.expenses > 0 ? Math.round((c.value / thisMonth.expenses) * 100) : 0}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </ChartCard>
        )}
      </div>

      {/* Budget + Debt */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {visible('budget') && (
          <ChartCard title="Budget progress" description={budget ? formatMonth(now) : 'No budget for this month'}
            actions={<Button asChild variant="ghost" size="sm" className="h-8 text-xs"><Link href="/app/budgets">Open budget<ArrowRight className="ml-1 h-3 w-3" /></Link></Button>}
            summary={bt ? `${Math.round(bt.pctUsed)}% of budget used.` : 'No budget yet.'}>
            {!budget || !bt ? (
              <EmptyState title="Create your first monthly budget" description="See where your money is going and what’s left to assign." actionLabel="Create budget" actionHref="/app/budgets" />
            ) : (
              <div className="space-y-3">
                {budget.entries.slice(0, 6).map((e) => {
                  const cat = categories.find((c) => c.id === e.categoryId)
                  const s = spent.get(e.categoryId) ?? 0
                  const pctUsed = e.budgeted > 0 ? Math.min(100, (s / e.budgeted) * 100) : 0
                  const status = budgetStatus(e.budgeted, s)
                  return (
                    <div key={e.categoryId} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <CategoryIcon icon={cat?.icon ?? 'shopping-bag'} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="truncate font-medium">{cat?.name ?? 'Category'}</span>
                          <span className="tnum text-muted-foreground">
                            <span className="font-semibold text-foreground">{formatCurrency(s, { decimals: 0 })}</span> / {formatCurrency(e.budgeted, { decimals: 0 })}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <Progress value={pctUsed} className={cn('h-1.5', status === 'over_budget' && '[&>div]:bg-destructive', status === 'near_limit' && '[&>div]:bg-warning')} />
                          <span className={cn('w-8 text-right text-[11px] font-medium tnum', status === 'over_budget' ? 'text-destructive' : 'text-muted-foreground')}>
                            {e.budgeted > 0 ? Math.round((s / e.budgeted) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div className="flex items-center justify-between border-t pt-3 text-sm">
                  <span className="text-muted-foreground">Remaining budget</span>
                  <Money value={bt.remaining} className={cn('font-bold', bt.remaining < 0 && 'text-destructive')} decimals={0} />
                </div>
              </div>
            )}
          </ChartCard>
        )}

        {visible('debt') && (
          <ChartCard title="Debt payoff" description="Avalanche plan with $100 extra per month"
            actions={<Button asChild variant="ghost" size="sm" className="h-8 text-xs"><Link href="/app/debt">Manage debt<ArrowRight className="ml-1 h-3 w-3" /></Link></Button>}
            summary={debtPlan ? `Debt-free around ${formatDate(debtPlan.debtFreeDate, 'MMM yyyy')}.` : 'No debts added.'}>
            {!debtPlan ? (
              <EmptyState title="Add at least one debt" description="Create a personalized payoff plan with real dates and interest." actionLabel="Add debt" actionHref="/app/debt?add=1" />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div><p className="text-[11px] text-muted-foreground">Current debt</p><Money value={totalDebt} className="text-lg font-bold" decimals={0} /></div>
                  <div><p className="text-[11px] text-muted-foreground">Principal paid</p><Money value={round2(debts.reduce((s, d) => s + (d.originalBalance - d.balance), 0))} className="text-lg font-bold text-success" decimals={0} /></div>
                  <div><p className="text-[11px] text-muted-foreground">Interest remaining</p><Money value={debtPlan.totalInterest} className="text-lg font-bold" decimals={0} /></div>
                  <div><p className="text-[11px] text-muted-foreground">Debt-free date</p><p className="text-lg font-bold tnum">{formatDate(debtPlan.debtFreeDate, 'MMM yyyy')}</p></div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress to debt-free</span>
                    <span className="tnum">{Math.round((debts.reduce((s, d) => s + (d.originalBalance - d.balance), 0) / Math.max(1, debts.reduce((s, d) => s + d.originalBalance, 0))) * 100)}%</span>
                  </div>
                  <Progress value={(debts.reduce((s, d) => s + (d.originalBalance - d.balance), 0) / Math.max(1, debts.reduce((s, d) => s + d.originalBalance, 0))) * 100} className="mt-1.5 h-2" />
                </div>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={debtPlan.timeline.filter((_, i) => i % Math.ceil(debtPlan.timeline.length / 40) === 0)}>
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => format(parseISO(`${v}-01`), 'MMM yy')} minTickGap={40} />
                      <YAxis hide domain={[0, 'dataMax']} />
                      <RTooltip content={<CurrencyTooltip />} />
                      <Area type="monotone" dataKey="totalBalance" name="Total balance" stroke="hsl(var(--chart-5))" fill="hsl(var(--chart-5)/0.12)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {debtPlan.firstDebtPaidOff && (
                  <p className="rounded-lg bg-success-muted px-3 py-2 text-xs text-success">
                    Next win: <span className="font-semibold">{debtPlan.firstDebtPaidOff}</span> pays off first, in {formatDate(debtPlan.payoffOrder[0].month + '-01', 'MMMM yyyy')}.
                  </p>
                )}
              </div>
            )}
          </ChartCard>
        )}
      </div>

      {/* Bills + Goals */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {visible('bills') && (
          <ChartCard title="Upcoming bills" description="Next 30 days"
            actions={<Button asChild variant="ghost" size="sm" className="h-8 text-xs"><Link href="/app/bills">Calendar<ArrowRight className="ml-1 h-3 w-3" /></Link></Button>}>
            {upcomingBills.length === 0 ? (
              <EmptyState title="No bills yet" description="Add recurring bills to see what’s due soon." actionLabel="Add bill" actionHref="/app/bills?add=1" />
            ) : (
              <ul className="divide-y">
                {upcomingBills.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <CalendarClock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(b.nextDueDate, 'EEE, MMM d')} · {accounts.find((a) => a.id === b.accountId)?.name ?? 'Any account'}{b.autopay ? ' · Autopay' : ''}
                      </p>
                    </div>
                    <Money value={b.amount} className="text-sm font-semibold" />
                    <StatusBadge status={b.status === 'upcoming' ? 'no_activity' : b.status} label={b.status === 'upcoming' ? 'Scheduled' : undefined} />
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>
        )}

        {visible('goals') && (
          <ChartCard title="Savings goals" description={`${goals.length} active goals`}
            actions={<Button asChild variant="ghost" size="sm" className="h-8 text-xs"><Link href="/app/goals">All goals<ArrowRight className="ml-1 h-3 w-3" /></Link></Button>}>
            {goals.length === 0 ? (
              <EmptyState title="No savings goals" description="Create a goal to track progress toward what matters." actionLabel="Add goal" actionHref="/app/goals?add=1" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {goals.slice(0, 3).map((g) => {
                  const gm = goalMath(g)
                  return (
                    <Link key={g.id} href={`/app/goals/${g.id}`} className="rounded-xl border p-3.5 transition-shadow hover:shadow-card">
                      <p className="truncate text-sm font-semibold">{g.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground tnum">
                        {formatCurrency(g.currentAmount, { decimals: 0 })} of {formatCurrency(g.targetAmount, { decimals: 0 })}
                      </p>
                      <Progress value={gm.pct} className="mt-2 h-1.5" />
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-semibold tnum">{Math.round(gm.pct)}%</span>
                        <StatusBadge status={g.status === 'completed' ? 'completed' : gm.onTrack ? 'on_track' : 'behind'} />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </ChartCard>
        )}
      </div>

      {/* Transactions + Insights + Stocks */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {visible('transactions') && (
          <ChartCard title="Recent transactions" className="lg:col-span-1"
            actions={<Button asChild variant="ghost" size="sm" className="h-8 text-xs"><Link href="/app/transactions">View all<ArrowRight className="ml-1 h-3 w-3" /></Link></Button>}>
            <ul className="divide-y">
              {recentTransactions.map((t) => {
                const cat = categories.find((c) => c.id === t.categoryId)
                return (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <CategoryIcon icon={cat?.icon ?? 'shopping-bag'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.merchant}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(t.date, 'MMM d')} · {cat?.name ?? 'Uncategorized'}</p>
                    </div>
                    <Money value={t.type === 'income' ? t.amount : -t.amount} sign className={cn('text-sm font-semibold', t.type === 'income' ? 'text-success' : '')} />
                  </li>
                )
              })}
            </ul>
          </ChartCard>
        )}

        {visible('insights') && (
          <ChartCard title="Financial insights" description="Rules-based, from your data" className="lg:col-span-1">
            {insights.length === 0 ? (
              <EmptyState title="No insights yet" description="Insights appear as Pennyward learns your patterns." />
            ) : (
              <ul className="space-y-3">
                {insights.map((ins, i) => (
                  <li key={i} className="flex gap-3 rounded-xl bg-accent/60 p-3">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="text-sm">{ins}</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground">Insights are educational, not financial advice.</p>
          </ChartCard>
        )}

        {visible('stocks') && (
          <ChartCard title="Stock snapshot" description={watchlists[0]?.name ?? 'Watchlist'} className="lg:col-span-1"
            actions={<Button asChild variant="ghost" size="sm" className="h-8 text-xs"><Link href="/app/stocks">Open stocks<ArrowRight className="ml-1 h-3 w-3" /></Link></Button>}>
            {stockSnapshot.length === 0 ? (
              <EmptyState title="No watchlist" description="Create a watchlist to follow companies you care about." actionLabel="Open stocks" actionHref="/app/stocks" />
            ) : (
              <ul className="divide-y">
                {stockSnapshot.map((q) => q && (
                  <li key={q.ticker}>
                    <Link href={`/app/stocks/${q.ticker}`} className="flex items-center gap-3 py-2.5">
                      <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold">{q.ticker}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{q.name}</p>
                        <p className={cn('text-xs tnum', q.changePct >= 0 ? 'text-success' : 'text-destructive')}>
                          {q.changePct >= 0 ? '+' : ''}{q.changePct.toFixed(2)}% today
                        </p>
                      </div>
                      <Money value={q.price} className="text-sm font-semibold" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground">Stock information is for educational purposes only and is not financial advice.</p>
          </ChartCard>
        )}
      </div>
    </div>
  )
}
