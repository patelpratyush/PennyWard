'use client'
import { useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ChevronDown, ChevronRight, Download, Printer, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/stores/useStore'
import { PageHeader } from '@/components/shared/Misc'
import { ErrorState } from '@/components/shared/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { calculateCarLoan } from '@/lib/finance/carLoan'
import { calculateLoan } from '@/lib/finance/loans'
import { downloadCSV, formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { LoanResult } from '@/types'

export default function Amortization() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const scenarios = useStore((s) => s.scenarios)
  const scenario = scenarios.find((s) => s.id === id)
  const [view, setView] = useState<'table' | 'chart'>('table')
  const [search, setSearch] = useState('')
  const [collapsedYears, setCollapsedYears] = useState<string[]>([])
  const [compare, setCompare] = useState(false)

  const result: LoanResult | null = useMemo(() => {
    if (!scenario) return null
    if (scenario.kind === 'car') return calculateCarLoan(scenario)
    return calculateLoan({
      principal: scenario.loanAmount, apr: scenario.apr, termMonths: scenario.termMonths,
      startDate: scenario.startDate, extraMonthly: scenario.extraMonthly, oneTimePayment: scenario.oneTimePayment,
    })
  }, [scenario])

  const standard: LoanResult | null = useMemo(() => {
    if (!scenario) return null
    const base = scenario.kind === 'car'
      ? calculateCarLoan({ ...scenario, extraMonthly: 0, oneTimePayment: 0 })
      : calculateLoan({ principal: scenario.loanAmount, apr: scenario.apr, termMonths: scenario.termMonths, startDate: scenario.startDate })
    return base
  }, [scenario])

  const filtered = useMemo(() => {
    if (!result) return []
    if (!search.trim()) return result.schedule
    const q = search.toLowerCase()
    return result.schedule.filter((r) => String(r.paymentNumber).includes(q) || r.date.includes(q) || format(parseISO(r.date), 'MMMM yyyy').toLowerCase().includes(q))
  }, [result, search])

  const byYear = useMemo(() => {
    const years: { year: string; rows: typeof filtered }[] = []
    for (const row of filtered) {
      const y = row.date.slice(0, 4)
      const bucket = years.find((x) => x.year === y)
      if (bucket) bucket.rows.push(row)
      else years.push({ year: y, rows: [row] })
    }
    return years
  }, [filtered])

  const comparisonSeries = useMemo(() => {
    if (!result || !standard) return []
    const len = Math.max(result.schedule.length, standard.schedule.length)
    const stepSize = Math.max(1, Math.ceil(len / 80))
    const rows: { n: number; standard: number; accelerated: number }[] = []
    for (let k = 0; k < len; k += stepSize) {
      rows.push({ n: k + 1, standard: standard.schedule[k]?.endingBalance ?? 0, accelerated: result.schedule[k]?.endingBalance ?? 0 })
    }
    return rows
  }, [result, standard])

  if (!scenario || !result) {
    return (
      <ErrorState
        title="Scenario not found"
        description="This amortization schedule belongs to a saved scenario. Save one from a calculator first."
        onRetry={() => router.push('/app/loans/car-calculator')}
      />
    )
  }

  const exportCSV = () => {
    downloadCSV(
      `pennyward-amortization-${scenario.name.replace(/\s+/g, '-').toLowerCase()}.csv`,
      ['Payment #', 'Date', 'Starting balance', 'Scheduled payment', 'Extra payment', 'Total payment', 'Principal', 'Interest', 'Ending balance', 'Cumulative principal', 'Cumulative interest'],
      result.schedule.map((r) => [r.paymentNumber, r.date, r.startingBalance, r.scheduledPayment, r.extraPayment, r.totalPayment, r.principal, r.interest, r.endingBalance, r.cumulativePrincipal, r.cumulativeInterest]),
    )
    toast.success('Amortization schedule exported.')
  }

  return (
    <div>
      <PageHeader
        title={`Amortization — ${scenario.name}`}
        description={`${formatCurrency(scenario.kind === 'car' ? scenario.vehiclePrice : scenario.loanAmount, { decimals: 0 })} · ${scenario.apr}% APR · ${scenario.termMonths} months`}
        actions={
          <>
            <Button variant="outline" onClick={() => setCompare(!compare)}>
              {compare ? 'Hide' : 'Show'} standard comparison
            </Button>
            <Button variant="outline" onClick={exportCSV}><Download className="mr-1.5 h-4 w-4" />Export CSV</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" />Print</Button>
          </>
        }
      />

      {/* Sticky summary */}
      <Card className="sticky top-16 z-10 shadow-card">
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
          <div><p className="text-[11px] text-muted-foreground">Monthly payment</p><p className="font-bold tnum">{formatCurrency(result.monthlyPayment)}</p></div>
          <div><p className="text-[11px] text-muted-foreground">Total interest</p><p className="font-bold tnum">{formatCurrency(result.totalInterest, { decimals: 0 })}</p></div>
          <div><p className="text-[11px] text-muted-foreground">Total paid</p><p className="font-bold tnum">{formatCurrency(result.totalPaid, { decimals: 0 })}</p></div>
          <div><p className="text-[11px] text-muted-foreground">Payments</p><p className="font-bold tnum">{result.months}</p></div>
          <div><p className="text-[11px] text-muted-foreground">Payoff date</p><p className="font-bold tnum">{format(parseISO(result.payoffDate), 'MMM yyyy')}</p></div>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by payment # or date…" className="pl-9" aria-label="Search schedule" />
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as 'table' | 'chart')}>
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="chart">Chart</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === 'chart' ? (
        <Card className="mt-4 shadow-card">
          <CardContent className="p-5">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {compare ? (
                  <LineChart data={comparisonSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="n" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={38} />
                    <RTooltip formatter={(v: number) => formatCurrency(v, { decimals: 0 })} labelFormatter={(v) => `Payment ${v}`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="standard" name="Standard" stroke="hsl(var(--chart-8))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="accelerated" name="With extras" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                  </LineChart>
                ) : (
                  <AreaChart data={result.schedule.filter((_, k) => k % Math.max(1, Math.ceil(result.schedule.length / 100)) === 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => format(parseISO(v), 'MMM yy')} minTickGap={36} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={38} />
                    <RTooltip formatter={(v: number) => formatCurrency(v, { decimals: 0 })} labelFormatter={(v) => format(parseISO(v as string), 'MMM d, yyyy')} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="endingBalance" name="Remaining balance" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1)/0.15)" strokeWidth={2} />
                    <Area type="monotone" dataKey="cumulativeInterest" name="Cumulative interest" stroke="hsl(var(--chart-4))" fill="hsl(var(--chart-4)/0.1)" strokeWidth={1.5} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-4 shadow-card">
          <CardContent className="p-0">
            <div className="max-h-[70vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Start balance</TableHead>
                    <TableHead className="text-right">Scheduled</TableHead>
                    <TableHead className="text-right">Extra</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Interest</TableHead>
                    <TableHead className="text-right">End balance</TableHead>
                    <TableHead className="text-right">Cum. principal</TableHead>
                    <TableHead className="text-right">Cum. interest</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byYear.map(({ year, rows }) => {
                    const collapsed = collapsedYears.includes(year)
                    const yearInterest = rows.reduce((s, r) => s + r.interest, 0)
                    const yearPrincipal = rows.reduce((s, r) => s + r.principal, 0)
                    return (
                      <>
                        <TableRow key={year} className="cursor-pointer bg-muted/50 hover:bg-muted" onClick={() => setCollapsedYears(collapsed ? collapsedYears.filter((y) => y !== year) : [...collapsedYears, year])}>
                          <TableCell>{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</TableCell>
                          <TableCell colSpan={3} className="font-semibold">{year}</TableCell>
                          <TableCell colSpan={3} className="text-right text-xs text-muted-foreground tnum">{rows.length} payments</TableCell>
                          <TableCell className="text-right text-xs font-medium tnum">{formatCurrency(yearPrincipal, { decimals: 0 })}</TableCell>
                          <TableCell className="text-right text-xs font-medium tnum">{formatCurrency(yearInterest, { decimals: 0 })}</TableCell>
                          <TableCell colSpan={3} />
                        </TableRow>
                        {!collapsed && rows.map((r) => (
                          <TableRow key={r.paymentNumber} className={cn(r.endingBalance <= 0.004 && 'bg-success-muted/40')}>
                            <TableCell />
                            <TableCell className="tnum">{r.paymentNumber}</TableCell>
                            <TableCell className="whitespace-nowrap tnum">{format(parseISO(r.date), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="text-right tnum">{formatCurrency(r.startingBalance)}</TableCell>
                            <TableCell className="text-right tnum">{formatCurrency(r.scheduledPayment)}</TableCell>
                            <TableCell className="text-right tnum text-primary">{r.extraPayment > 0 ? formatCurrency(r.extraPayment) : '—'}</TableCell>
                            <TableCell className="text-right tnum">{formatCurrency(r.totalPayment)}</TableCell>
                            <TableCell className="text-right tnum">{formatCurrency(r.principal)}</TableCell>
                            <TableCell className="text-right tnum">{formatCurrency(r.interest)}</TableCell>
                            <TableCell className="text-right font-medium tnum">{formatCurrency(r.endingBalance)}</TableCell>
                            <TableCell className="text-right text-muted-foreground tnum">{formatCurrency(r.cumulativePrincipal, { decimals: 0 })}</TableCell>
                            <TableCell className="text-right text-muted-foreground tnum">{formatCurrency(r.cumulativeInterest, { decimals: 0 })}</TableCell>
                          </TableRow>
                        ))}
                      </>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Final payment is adjusted so the balance ends at exactly $0.00 — never negative.</p>
    </div>
  )
}
