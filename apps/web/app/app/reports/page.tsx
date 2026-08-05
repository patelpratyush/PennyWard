'use client'
import { useMemo, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { endOfMonth, format, parseISO, subMonths } from 'date-fns'
import Link from 'next/link'
import {
  CalendarClock, CreditCard, Download, FileBarChart, Goal, Lock, Printer,
  Receipt, Scale, TrendingUp, Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/stores/useStore'
import { useMe } from '@/hooks/queries/useMe'
import { useGoals } from '@/hooks/queries/useGoals'
import { useNetWorthHistory } from '@/hooks/queries/useNetWorthHistory'
import { useAccounts } from '@/hooks/queries/useAccounts'
import { useCategories } from '@/hooks/queries/useCategories'
import { useAllTransactions } from '@/hooks/queries/useAllTransactions'
import { useBudget } from '@/hooks/queries/useBudgets'
import { useDebts } from '@/hooks/queries/useDebts'
import { PageHeader } from '@/components/shared/Misc'
import { LoadingSkeleton } from '@/components/shared/States'
import { Money } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { budgetStatus, netWorth } from '@/lib/finance/budget'
import { categoryTotals, monthlySummaries } from '@/lib/finance/derive'
import { downloadCSV, formatCurrency, formatDate, round2 } from '@/lib/format'
import { cn } from '@/lib/utils'

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-6))', 'hsl(var(--chart-7))', 'hsl(var(--chart-8))']

const reportCards = [
  { id: 'spending', icon: Receipt, title: 'Monthly spending report', desc: 'Expenses by category, merchant, and day for any period.' },
  { id: 'cashflow', icon: Scale, title: 'Income vs. expenses', desc: 'Cash-flow report with savings rate by month.' },
  { id: 'networth', icon: TrendingUp, title: 'Net-worth report', desc: 'Assets, liabilities, and the trend between them.' },
  { id: 'budget', icon: Wallet, title: 'Budget performance', desc: 'Budgeted vs. actual with variance by category.' },
  { id: 'debt', icon: CreditCard, title: 'Debt payoff report', desc: 'Balances, interest paid, and progress to zero.' },
  { id: 'goals', icon: Goal, title: 'Savings goals report', desc: 'Funding levels, contributions, and completion forecasts.' },
  { id: 'bills', icon: CalendarClock, title: 'Bills & payments summary', desc: 'What was due, what was paid, and what autopay covers.' },
  { id: 'transactions', icon: FileBarChart, title: 'Detailed transactions report', desc: 'Every transaction in the period, fully exportable.' },
] as const

type ReportId = (typeof reportCards)[number]['id']

// Free tier's two "Basic" report types — client-only gate, see lib/plan.ts's
// `advancedReports` doc comment for why this isn't (and can't meaningfully be)
// a server-enforced boundary.
const freeReportIds = new Set<ReportId>(['spending', 'cashflow'])
const FREE_REPORT_MONTHS_BACK = 3

export default function Reports() {
  // Bills are out of migration scope for this plan and stay on the legacy
  // store. Accounts, transactions, categories, budgets, debts, and goals are
  // migrated entities and are read from the real API via React Query.
  const { bills } = useStore()
  const { data: goals = [] } = useGoals()
  const { data: me } = useMe()
  const advancedReports = me?.limits.advancedReports ?? true
  const minFrom = format(subMonths(new Date(), FREE_REPORT_MONTHS_BACK), 'yyyy-MM-01')
  const [active, setActive] = useState<ReportId | null>(null)
  const [from, setFrom] = useState(format(subMonths(new Date(), 2), 'yyyy-MM-01'))
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [accountFilter, setAccountFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const accountsQ = useAccounts()
  const categoriesQ = useCategories()
  const debtsQ = useDebts()
  const netWorthHistoryQ = useNetWorthHistory({ from, to })
  const accounts = accountsQ.data ?? []
  const categories = categoriesQ.data ?? []
  const debts = debtsQ.data ?? []
  const netWorthHistory = netWorthHistoryQ.data ?? []

  // The API filters accountId/categoryId server-side but not transfer-split
  // category matches (transaction splits aren't modeled in the DB yet), so
  // apply the category filter's split fallback client-side over the returned page.
  const rangedQ = useAllTransactions({
    from, to,
    accountId: accountFilter !== 'all' ? accountFilter : undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
  })
  const ranged = useMemo(() => rangedQ.data ?? [], [rangedQ.data])

  // The budget report looks at a specific month (derived from the "to" filter),
  // independent of the ranged transaction filters above, so it needs its own
  // unfiltered-by-account/category fetch for that whole month.
  const budgetMonth = to.slice(0, 7)
  const budgetMonthStart = `${budgetMonth}-01`
  const budgetMonthEnd = format(endOfMonth(parseISO(budgetMonthStart)), 'yyyy-MM-dd')
  const budgetMonthTxQ = useAllTransactions({ from: budgetMonthStart, to: budgetMonthEnd })
  const budgetMonthTransactions = useMemo(() => budgetMonthTxQ.data ?? [], [budgetMonthTxQ.data])
  const budgetQ = useBudget(budgetMonth)
  const budget = budgetQ.data ?? null

  const isLoading = accountsQ.isLoading || categoriesQ.isLoading || debtsQ.isLoading || rangedQ.isLoading
    || (active === 'budget' && (budgetMonthTxQ.isLoading || budgetQ.isLoading))

  const summaries = useMemo(() => monthlySummaries(ranged, 6), [ranged])

  const report = useMemo(() => {
    if (!active) return null
    const expenses = ranged.filter((t) => t.type === 'expense')
    const income = ranged.filter((t) => t.type === 'income')
    const totalExp = round2(expenses.reduce((s, t) => s + t.amount, 0))
    const totalInc = round2(income.reduce((s, t) => s + t.amount, 0))

    if (active === 'spending') {
      const byCat = [...categoryTotals(ranged, '').entries()].map(([id, value]) => ({ name: categories.find((c) => c.id === id)?.name ?? 'Other', value })).sort((a, b) => b.value - a.value)
      const byMerchant = new Map<string, number>()
      for (const t of expenses) byMerchant.set(t.merchant, round2((byMerchant.get(t.merchant) ?? 0) + t.amount))
      const topMerchants = [...byMerchant.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
      const largest = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5)
      const byDay = new Map<string, number>()
      for (const t of expenses) byDay.set(t.date, round2((byDay.get(t.date) ?? 0) + t.amount))
      return { kind: 'spending' as const, totalExp, byCat, topMerchants, largest, byDay: [...byDay.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date)) }
    }
    if (active === 'cashflow') {
      const rows = summaries.map((s) => ({ ...s, savingsRate: s.income > 0 ? round2((s.net / s.income) * 100) : 0 }))
      return { kind: 'cashflow' as const, totalInc, totalExp, rows }
    }
    if (active === 'networth') {
      const nw = netWorth(accounts)
      const rows = accounts.filter((a) => a.includeInNetWorth && !a.archived).map((a) => ({ name: a.name, type: a.type, balance: a.balance }))
      return { kind: 'networth' as const, nw, rows, history: netWorthHistory }
    }
    if (active === 'budget') {
      if (!budget) return { kind: 'budget' as const, rows: [], month: '' }
      const catMap = categoryTotals(budgetMonthTransactions, budget.month)
      const rows = budget.entries.map((e) => {
        const spent = catMap.get(e.categoryId) ?? 0
        return {
          name: categories.find((c) => c.id === e.categoryId)?.name ?? e.categoryId,
          budgeted: e.budgeted, spent, variance: round2(e.budgeted - spent),
          pct: e.budgeted > 0 ? round2((spent / e.budgeted) * 100) : 0,
          status: budgetStatus(e.budgeted, spent),
        }
      })
      return { kind: 'budget' as const, rows, month: budget.month }
    }
    if (active === 'debt') {
      const rows = debts.map((d) => ({
        name: d.name, balance: d.balance, original: d.originalBalance, apr: d.apr,
        minimum: d.minimumPayment, paidOff: round2(d.originalBalance - d.balance),
        monthlyInterest: round2((d.balance * d.apr) / 100 / 12),
      }))
      return { kind: 'debt' as const, rows }
    }
    if (active === 'goals') {
      const rows = goals.map((g) => ({
        name: g.name, target: g.targetAmount, current: g.currentAmount,
        pct: g.targetAmount > 0 ? round2((g.currentAmount / g.targetAmount) * 100) : 0,
        monthly: g.monthlyContribution, targetDate: g.targetDate,
        contributions: g.contributions.length,
      }))
      return { kind: 'goals' as const, rows }
    }
    if (active === 'bills') {
      const rows = bills.map((b) => ({
        name: b.name, amount: b.amount, frequency: b.frequency, autopay: b.autopay,
        isIncome: b.isIncome, paid: b.paidDates.length, next: b.nextDueDate,
      }))
      return { kind: 'bills' as const, rows }
    }
    if (active === 'transactions') {
      return { kind: 'transactions' as const, rows: ranged }
    }
    return null
  }, [active, ranged, summaries, accounts, budget, categories, budgetMonthTransactions, debts, goals, bills, netWorthHistory])

  const exportReport = () => {
    if (!report || !active) return
    const meta = reportCards.find((r) => r.id === active)
    const filename = `pennyward-${active}-report-${from}-to-${to}.csv`
    if (report.kind === 'spending') {
      downloadCSV(filename, ['Category', 'Amount'], report.byCat.map((r) => [r.name, r.value]))
    } else if (report.kind === 'cashflow') {
      downloadCSV(filename, ['Month', 'Income', 'Expenses', 'Net', 'Savings rate %'], report.rows.map((r) => [r.month, r.income, r.expenses, r.net, r.savingsRate]))
    } else if (report.kind === 'networth') {
      downloadCSV(filename, ['Account', 'Type', 'Balance'], report.rows.map((r) => [r.name, r.type, r.balance]))
    } else if (report.kind === 'budget') {
      downloadCSV(filename, ['Category', 'Budgeted', 'Spent', 'Variance', '% used'], report.rows.map((r) => [r.name, r.budgeted, r.spent, r.variance, r.pct]))
    } else if (report.kind === 'debt') {
      downloadCSV(filename, ['Debt', 'Balance', 'Original', 'APR', 'Minimum', 'Principal paid', 'Monthly interest'], report.rows.map((r) => [r.name, r.balance, r.original, r.apr, r.minimum, r.paidOff, r.monthlyInterest]))
    } else if (report.kind === 'goals') {
      downloadCSV(filename, ['Goal', 'Target', 'Current', '% funded', 'Monthly', 'Target date'], report.rows.map((r) => [r.name, r.target, r.current, r.pct, r.monthly, r.targetDate]))
    } else if (report.kind === 'bills') {
      downloadCSV(filename, ['Bill', 'Amount', 'Frequency', 'Autopay', 'Times paid', 'Next due'], report.rows.map((r) => [r.name, r.amount, r.frequency, r.autopay ? 'Yes' : 'No', r.paid, r.next]))
    } else if (report.kind === 'transactions') {
      downloadCSV(filename, ['Date', 'Merchant', 'Type', 'Amount'],
        report.rows.map((t) => [t.date, t.merchant, t.type, t.type === 'expense' ? -t.amount : t.amount]))
    }
    toast.success(`${meta?.title} exported to CSV.`)
  }

  if (!active) {
    return (
      <div>
        <PageHeader title="Reports" description="Eight focused reports — filter, visualize, and export." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {reportCards.map((r) => {
            const locked = !advancedReports && !freeReportIds.has(r.id)
            if (locked) {
              return (
                <Link key={r.id} href="/pricing" className="text-left">
                  <Card className="h-full shadow-card opacity-60 transition-shadow hover:shadow-lift hover:opacity-80">
                    <CardContent className="p-5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Lock className="h-5 w-5" />
                      </div>
                      <h2 className="mt-3 font-semibold">{r.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
                      <p className="mt-2 text-xs font-medium text-primary">Upgrade to unlock</p>
                    </CardContent>
                  </Card>
                </Link>
              )
            }
            return (
              <button key={r.id} onClick={() => setActive(r.id)} className="text-left">
                <Card className="h-full shadow-card transition-shadow hover:shadow-lift">
                  <CardContent className="p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <r.icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-3 font-semibold">{r.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
                  </CardContent>
                </Card>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const meta = reportCards.find((r) => r.id === active)!

  if (isLoading) {
    return (
      <div>
        <PageHeader title={meta.title} description={meta.desc} actions={<Button variant="ghost" onClick={() => setActive(null)}>All reports</Button>} />
        <LoadingSkeleton rows={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={meta.title}
        description={meta.desc}
        actions={
          <>
            <Button variant="ghost" onClick={() => setActive(null)}>All reports</Button>
            <Button variant="outline" onClick={exportReport}><Download className="mr-1.5 h-4 w-4" />Export CSV</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" />Print</Button>
          </>
        }
      />

      {/* Filters */}
      <Card className="mb-4 shadow-card">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date" value={from} min={advancedReports ? undefined : minFrom}
              onChange={(e) => setFrom(advancedReports ? e.target.value : (e.target.value < minFrom ? minFrom : e.target.value))}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Account</Label>
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.filter((c) => !c.archived).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Report bodies */}
      {report?.kind === 'spending' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total spending</p><Money value={report.totalExp} className="mt-1 block text-xl font-bold" decimals={0} /></CardContent></Card>
            <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Transactions</p><p className="mt-1 text-xl font-bold tnum">{ranged.filter((t) => t.type === 'expense').length}</p></CardContent></Card>
            <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Categories used</p><p className="mt-1 text-xl font-bold tnum">{report.byCat.length}</p></CardContent></Card>
            <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Top category</p><p className="mt-1 truncate text-xl font-bold">{report.byCat[0]?.name ?? '—'}</p></CardContent></Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">By category</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="h-48 w-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={report.byCat.slice(0, 7)} dataKey="value" innerRadius={50} outerRadius={85} paddingAngle={2} strokeWidth={0}>
                        {report.byCat.slice(0, 7).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <RTooltip formatter={(v: number) => formatCurrency(v, { decimals: 0 })} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-full space-y-1 text-xs">
                  {report.byCat.slice(0, 7).map((c, i) => (
                    <li key={c.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="font-semibold tnum">{formatCurrency(c.value, { decimals: 0 })}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Spending by day</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={report.byDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => format(parseISO(v), 'M/d')} minTickGap={30} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={40} />
                      <RTooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(v) => format(parseISO(v as string), 'MMM d')} />
                      <Area type="monotone" dataKey="value" name="Spending" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1)/0.15)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Top merchants</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Merchant</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {report.topMerchants.map(([m, v]) => (
                      <TableRow key={m}><TableCell className="text-sm">{m}</TableCell><TableCell className="text-right tnum">{formatCurrency(v)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Largest transactions</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Merchant</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {report.largest.map((t) => (
                      <TableRow key={t.id}><TableCell className="tnum">{formatDate(t.date, 'MMM d')}</TableCell><TableCell className="max-w-40 truncate text-sm">{t.merchant}</TableCell><TableCell className="text-right tnum">{formatCurrency(t.amount)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {report?.kind === 'cashflow' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total income</p><Money value={report.totalInc} className="mt-1 block text-xl font-bold text-success" decimals={0} /></CardContent></Card>
            <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total expenses</p><Money value={report.totalExp} className="mt-1 block text-xl font-bold" decimals={0} /></CardContent></Card>
            <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Net cash flow</p><Money value={round2(report.totalInc - report.totalExp)} className={cn('mt-1 block text-xl font-bold', report.totalInc - report.totalExp >= 0 ? 'text-success' : 'text-destructive')} decimals={0} /></CardContent></Card>
          </div>
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Monthly cash flow</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.rows} barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} width={42} />
                    <RTooltip formatter={(v: number) => formatCurrency(v, { decimals: 0 })} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="income" name="Income" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="net" name="Net" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Income</TableHead><TableHead className="text-right">Expenses</TableHead><TableHead className="text-right">Net</TableHead><TableHead className="text-right">Savings rate</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {report.rows.map((r) => (
                      <TableRow key={r.month}>
                        <TableCell className="tnum">{format(parseISO(`${r.month}-01`), 'MMM yyyy')}</TableCell>
                        <TableCell className="text-right tnum">{formatCurrency(r.income, { decimals: 0 })}</TableCell>
                        <TableCell className="text-right tnum">{formatCurrency(r.expenses, { decimals: 0 })}</TableCell>
                        <TableCell className={cn('text-right tnum', r.net >= 0 ? 'text-success' : 'text-destructive')}>{formatCurrency(r.net, { decimals: 0 })}</TableCell>
                        <TableCell className="text-right tnum">{r.savingsRate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {report?.kind === 'networth' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="shadow-card">
            <CardContent className="space-y-3 p-5">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Assets</span><Money value={report.nw.assets} className="font-bold text-success" /></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Liabilities</span><Money value={report.nw.liabilities} className="font-bold text-destructive" /></div>
              <div className="flex justify-between border-t pt-3"><span className="font-semibold">Net worth</span><Money value={report.nw.netWorth} className="text-xl font-bold" /></div>
            </CardContent>
          </Card>
          <Card className="shadow-card lg:col-span-2">
            <CardHeader><CardTitle className="text-base">By account</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                <TableBody>
                  {report.rows.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="text-sm font-medium">{r.name}</TableCell>
                      <TableCell className="text-sm capitalize text-muted-foreground">{r.type.replace('_', ' ')}</TableCell>
                      <TableCell className={cn('text-right tnum', r.balance < 0 && 'text-destructive')}>{formatCurrency(r.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {report.history.length >= 2 && (
            <Card className="shadow-card lg:col-span-3">
              <CardHeader><CardTitle className="text-base">Net worth over time</CardTitle></CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={report.history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => format(parseISO(v), 'MMM d')} minTickGap={36} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={44} />
                      <RTooltip formatter={(v: number) => formatCurrency(v, { decimals: 0 })} labelFormatter={(v) => format(parseISO(v as string), 'MMM d, yyyy')} />
                      <Area type="monotone" dataKey="netWorth" name="Net worth" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1)/0.15)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {report?.kind === 'budget' && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Budgeted vs. actual {report.month && `— ${format(parseISO(`${report.month}-01`), 'MMMM yyyy')}`}</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            {report.rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No budget found for this period.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Budgeted</TableHead><TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Variance</TableHead><TableHead className="text-right">% used</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {report.rows.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="text-sm font-medium">{r.name}</TableCell>
                      <TableCell className="text-right tnum">{formatCurrency(r.budgeted, { decimals: 0 })}</TableCell>
                      <TableCell className="text-right tnum">{formatCurrency(r.spent, { decimals: 0 })}</TableCell>
                      <TableCell className={cn('text-right tnum', r.variance < 0 ? 'text-destructive' : 'text-success')}>{formatCurrency(r.variance, { decimals: 0, sign: true })}</TableCell>
                      <TableCell className="text-right tnum">{r.pct}%</TableCell>
                      <TableCell><span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', r.status === 'on_track' && 'bg-success-muted text-success', r.status === 'near_limit' && 'bg-warning-muted text-warning', r.status === 'over_budget' && 'bg-destructive/10 text-destructive', r.status === 'no_activity' && 'bg-muted text-muted-foreground')}>{r.status.replace('_', ' ')}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {report?.kind === 'debt' && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Debt payoff status</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Debt</TableHead><TableHead className="text-right">Balance</TableHead><TableHead className="text-right">Original</TableHead><TableHead className="text-right">APR</TableHead><TableHead className="text-right">Minimum</TableHead><TableHead className="text-right">Principal paid</TableHead><TableHead className="text-right">Monthly interest</TableHead></TableRow></TableHeader>
              <TableBody>
                {report.rows.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="text-sm font-medium">{r.name}</TableCell>
                    <TableCell className="text-right tnum">{formatCurrency(r.balance, { decimals: 0 })}</TableCell>
                    <TableCell className="text-right tnum">{formatCurrency(r.original, { decimals: 0 })}</TableCell>
                    <TableCell className="text-right tnum">{r.apr}%</TableCell>
                    <TableCell className="text-right tnum">{formatCurrency(r.minimum, { decimals: 0 })}</TableCell>
                    <TableCell className="text-right tnum text-success">{formatCurrency(r.paidOff, { decimals: 0 })}</TableCell>
                    <TableCell className="text-right tnum">{formatCurrency(r.monthlyInterest)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {report?.kind === 'goals' && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Savings goals status</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Goal</TableHead><TableHead className="text-right">Target</TableHead><TableHead className="text-right">Current</TableHead><TableHead className="text-right">% funded</TableHead><TableHead className="text-right">Monthly</TableHead><TableHead className="text-right">Contributions</TableHead><TableHead>Target date</TableHead></TableRow></TableHeader>
              <TableBody>
                {report.rows.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="text-sm font-medium">{r.name}</TableCell>
                    <TableCell className="text-right tnum">{formatCurrency(r.target, { decimals: 0 })}</TableCell>
                    <TableCell className="text-right tnum">{formatCurrency(r.current, { decimals: 0 })}</TableCell>
                    <TableCell className="text-right tnum">{r.pct}%</TableCell>
                    <TableCell className="text-right tnum">{formatCurrency(r.monthly, { decimals: 0 })}</TableCell>
                    <TableCell className="text-right tnum">{r.contributions}</TableCell>
                    <TableCell className="tnum">{formatDate(r.targetDate, 'MMM yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {report?.kind === 'bills' && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Bills & payment coverage</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Bill</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Frequency</TableHead><TableHead>Autopay</TableHead><TableHead className="text-right">Times paid</TableHead><TableHead>Next due</TableHead></TableRow></TableHeader>
              <TableBody>
                {report.rows.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="text-sm font-medium">{r.name}</TableCell>
                    <TableCell className={cn('text-right tnum', r.isIncome && 'text-success')}>{formatCurrency(r.amount)}</TableCell>
                    <TableCell className="text-sm capitalize">{r.frequency}</TableCell>
                    <TableCell className="text-sm">{r.autopay ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="text-right tnum">{r.paid}</TableCell>
                    <TableCell className="tnum">{formatDate(r.next, 'MMM d')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {report?.kind === 'transactions' && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">{report.rows.length} transactions in period</CardTitle></CardHeader>
          <CardContent className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card"><TableRow><TableHead>Date</TableHead><TableHead>Merchant</TableHead><TableHead>Category</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {report.rows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap tnum">{formatDate(t.date, 'MMM d, yyyy')}</TableCell>
                    <TableCell className="max-w-48 truncate text-sm">{t.merchant}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{categories.find((c) => c.id === t.categoryId)?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm capitalize">{t.type}</TableCell>
                    <TableCell className={cn('text-right tnum', t.type === 'income' && 'text-success')}>{formatCurrency(t.type === 'expense' ? -t.amount : t.amount, { sign: true })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
