'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, ArrowRight, Check, PartyPopper, Snowflake, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'
import { useDebts, useSavePayoffScenario } from '@/hooks/queries/useDebts'
import { PageHeader } from '@/components/shared/Misc'
import { EmptyState, LoadingSkeleton } from '@/components/shared/States'
import { Money } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { compareStrategies } from '@/lib/finance/debt'
import { formatCurrency, formatDate, round2 } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PayoffStrategy } from '@/types'

const strategyInfo: { id: PayoffStrategy; name: string; desc: string }[] = [
  { id: 'minimum', name: 'Minimum payments only', desc: 'Pay only the required minimums. Baseline for comparison — usually the slowest and most expensive path.' },
  { id: 'snowball', name: 'Debt snowball', desc: 'Attack the smallest balance first for quick wins, then roll each freed payment into the next debt.' },
  { id: 'avalanche', name: 'Debt avalanche', desc: 'Attack the highest interest rate first. Mathematically minimizes total interest paid.' },
  { id: 'custom', name: 'Custom order', desc: 'Choose your own payoff priority. Extra payments go to the first debt in your list.' },
]

export default function PayoffPlanner() {
  const router = useRouter()
  const { data: debts = [], isLoading } = useDebts()
  const savePayoffScenario = useSavePayoffScenario()
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [strategy, setStrategy] = useState<PayoffStrategy>('avalanche')
  const [extraMonthly, setExtraMonthly] = useState(200)
  const [oneTime, setOneTime] = useState(0)
  const [customOrder, setCustomOrder] = useState<string[]>([])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [scenarioName, setScenarioName] = useState('')
  const startMonth = format(new Date(), 'yyyy-MM')

  useEffect(() => {
    if (!isLoading && debts.length && selected.length === 0) {
      setSelected(debts.map((d) => d.id))
      setCustomOrder(debts.map((d) => d.id))
      setStep(1)
    }
  }, [isLoading, debts, selected.length])

  const chosen = useMemo(() => debts.filter((d) => selected.includes(d.id)), [debts, selected])
  const comparison = useMemo(
    () => (chosen.length ? compareStrategies(chosen, extraMonthly, oneTime, startMonth, customOrder) : null),
    [chosen, extraMonthly, oneTime, startMonth, customOrder])
  const active = comparison?.[strategy] ?? null

  const balanceSeries = useMemo(() => {
    if (!comparison) return []
    const len = Math.min(comparison.snowball.timeline.length, comparison.avalanche.timeline.length, 120)
    const stepSize = Math.max(1, Math.ceil(len / 60))
    const rows: { month: string; snowball: number; avalanche: number; minimum: number }[] = []
    for (let i = 0; i < len; i += stepSize) {
      rows.push({
        month: comparison.snowball.timeline[i]?.month ?? '',
        snowball: comparison.snowball.timeline[i]?.totalBalance ?? 0,
        avalanche: comparison.avalanche.timeline[i]?.totalBalance ?? 0,
        minimum: comparison.minimum.timeline[i]?.totalBalance ?? 0,
      })
    }
    return rows
  }, [comparison])

  const openSaveDialog = () => {
    setScenarioName(`${strategyInfo.find((s) => s.id === strategy)?.name} plan`)
    setSaveDialogOpen(true)
  }

  const savePlan = () => {
    if (!scenarioName.trim()) return
    savePayoffScenario.mutate(
      { name: scenarioName.trim(), strategy, extraMonthly, oneTimePayment: oneTime, startMonth, customOrder },
      {
        onSuccess: () => {
          toast.success('Payoff plan saved.')
          setSaveDialogOpen(false)
          router.push('/app/debt')
        },
        onError: () => toast.error('Could not save this payoff plan.'),
      },
    )
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Debt payoff planner" description="Snowball, avalanche, or your own order — with real dates and dollars." />
        <LoadingSkeleton rows={4} className="mt-6" />
      </div>
    )
  }

  if (step === 0 || debts.length === 0) {
    return (
      <div>
        <PageHeader title="Debt payoff planner" description="Snowball, avalanche, or your own order — with real dates and dollars." />
        <EmptyState
          title="Add at least one debt to create a personalized payoff plan"
          description="Once your debts are in, the planner compares strategies month by month."
          actionLabel="Add debt"
          actionHref="/app/debt?add=1"
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Debt payoff planner" description="Four steps to your debt-free date." />

      {/* Stepper */}
      <ol className="mb-8 flex items-center gap-2">
        {['Select debts', 'Strategy', 'Payments', 'Results'].map((s, i) => {
          const n = i + 1
          return (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                n < step && 'border-primary bg-primary text-primary-foreground',
                n === step && 'border-primary text-primary',
                n > step && 'text-muted-foreground')}>
                {n < step ? <Check className="h-3.5 w-3.5" /> : n}
              </span>
              <span className={cn('hidden text-xs font-medium sm:block', n === step ? 'text-foreground' : 'text-muted-foreground')}>{s}</span>
              {n < 4 && <span className="h-px flex-1 bg-border" />}
            </li>
          )
        })}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
          {step === 1 && (
            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Which debts should the plan cover?</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {debts.map((d) => (
                  <label key={d.id} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all hover:shadow-card', selected.includes(d.id) && 'border-primary bg-accent/50')}>
                    <Checkbox
                      checked={selected.includes(d.id)}
                      onCheckedChange={(v) => setSelected(v ? [...selected, d.id] : selected.filter((x) => x !== d.id))}
                      aria-label={`Include ${d.name}`}
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{d.name}</span>
                      <span className="text-xs text-muted-foreground tnum">
                        {formatCurrency(d.balance, { decimals: 0 })} · {d.apr}% APR · {formatCurrency(d.minimumPayment, { decimals: 0 })}/mo minimum
                      </span>
                    </span>
                  </label>
                ))}
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {strategyInfo.map((s) => (
                  <button key={s.id} onClick={() => setStrategy(s.id)}
                    className={cn('rounded-xl border bg-card p-4 text-left transition-all hover:shadow-card', strategy === s.id && 'border-primary bg-accent/50 ring-1 ring-primary')}
                    aria-pressed={strategy === s.id}>
                    <span className="flex items-center gap-2 font-semibold">
                      {s.id === 'snowball' && <Snowflake className="h-4 w-4 text-info" />}
                      {s.id === 'avalanche' && <TrendingDown className="h-4 w-4 text-primary" />}
                      {s.name}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">{s.desc}</span>
                  </button>
                ))}
              </div>
              {strategy === 'custom' && (
                <Card className="shadow-card">
                  <CardHeader><CardTitle className="text-base">Your payoff order</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {customOrder.map((id, i) => {
                      const d = debts.find((x) => x.id === id)
                      if (!d || !selected.includes(id)) return null
                      return (
                        <div key={id} className="flex items-center gap-2 rounded-lg border p-2.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary tnum">{i + 1}</span>
                          <span className="flex-1 text-sm font-medium">{d.name}</span>
                          <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => {
                            const next = [...customOrder]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; setCustomOrder(next)
                          }}>↑</Button>
                          <Button variant="ghost" size="sm" disabled={i === customOrder.length - 1} onClick={() => {
                            const next = [...customOrder]; [next[i + 1], next[i]] = [next[i], next[i + 1]]; setCustomOrder(next)
                          }}>↓</Button>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {step === 3 && (
            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Extra payment power</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="extra">Extra payment per month ($)</Label>
                  <Input id="extra" type="number" min="0" value={extraMonthly} onChange={(e) => setExtraMonthly(Number(e.target.value))} />
                  <p className="text-xs text-muted-foreground">Applied to the priority debt each month.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onetime">One-time payment this month ($)</Label>
                  <Input id="onetime" type="number" min="0" value={oneTime || ''} placeholder="0" onChange={(e) => setOneTime(Number(e.target.value))} />
                  <p className="text-xs text-muted-foreground">A bonus, tax refund, or gift applied once.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Start month</Label>
                  <Input value={format(parseISO(`${startMonth}-01`), 'MMMM yyyy')} disabled />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && active && comparison && (
            <div className="space-y-4">
              {/* Headline results */}
              <Card className="border-primary/40 bg-gradient-to-br from-accent/60 to-card shadow-lift">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <PartyPopper className="h-4 w-4 text-primary" />Debt-free date — {strategyInfo.find((s) => s.id === strategy)?.name}
                      </p>
                      <p className="mt-1 text-3xl font-extrabold tnum">{formatDate(active.debtFreeDate, 'MMMM yyyy')}</p>
                      <p className="mt-1 text-sm text-muted-foreground tnum">{active.months} monthly payments</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-4">
                      <div><p className="text-[11px] text-muted-foreground">Total interest</p><Money value={active.totalInterest} className="font-bold" decimals={0} /></div>
                      <div><p className="text-[11px] text-muted-foreground">Interest saved</p><Money value={active.interestSaved} className="font-bold text-success" decimals={0} /></div>
                      <div><p className="text-[11px] text-muted-foreground">Months saved</p><p className="font-bold tnum text-success">{active.monthsSaved}</p></div>
                      <div><p className="text-[11px] text-muted-foreground">Monthly payment</p><Money value={round2(chosen.reduce((s, d) => s + d.minimumPayment, 0) + extraMonthly)} className="font-bold" decimals={0} /></div>
                    </div>
                  </div>
                  {active.payoffOrder.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                      {active.payoffOrder.map((p, i) => (
                        <span key={p.debtId} className="rounded-full bg-muted px-3 py-1 text-xs tnum">
                          {i + 1}. {p.name} — {format(parseISO(`${p.month}-01`), 'MMM yyyy')}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Charts */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="shadow-card">
                  <CardHeader><CardTitle className="text-base">Balance over time</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={balanceSeries}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => format(parseISO(`${v}-01`), 'MMM yy')} minTickGap={36} />
                          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={38} />
                          <RTooltip formatter={(v: number) => formatCurrency(v, { decimals: 0 })} labelFormatter={(v) => format(parseISO(`${v}-01`), 'MMM yyyy')} />
                          <Area type="monotone" dataKey="minimum" name="Minimums" stroke="hsl(var(--chart-8))" fill="hsl(var(--chart-8)/0.08)" strokeWidth={1.5} />
                          <Area type="monotone" dataKey="snowball" name="Snowball" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2)/0.1)" strokeWidth={1.5} />
                          <Area type="monotone" dataKey="avalanche" name="Avalanche" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1)/0.12)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-card">
                  <CardHeader><CardTitle className="text-base">Total interest by strategy</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: 'Minimums', value: comparison.minimum.totalInterest },
                          { name: 'Snowball', value: comparison.snowball.totalInterest },
                          { name: 'Avalanche', value: comparison.avalanche.totalInterest },
                          { name: 'Custom', value: comparison.custom.totalInterest },
                        ]} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={74} />
                          <RTooltip formatter={(v: number) => formatCurrency(v, { decimals: 0 })} />
                          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                            {[0, 1, 2, 3].map((i) => <Cell key={i} fill={['hsl(var(--chart-8))', 'hsl(var(--chart-2))', 'hsl(var(--chart-1))', 'hsl(var(--chart-6))'][i]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Comparison table */}
              <Card className="shadow-card">
                <CardHeader><CardTitle className="text-base">Strategy comparison</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Strategy</TableHead>
                        <TableHead>Payoff date</TableHead>
                        <TableHead className="text-right">Months</TableHead>
                        <TableHead className="text-right">Total interest</TableHead>
                        <TableHead className="text-right">Interest saved</TableHead>
                        <TableHead>First debt done</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(['minimum', 'snowball', 'avalanche', 'custom'] as const).map((s) => {
                        const r = comparison[s]
                        return (
                          <TableRow key={s} className={cn(strategy === s && 'bg-accent/50')}>
                            <TableCell className="font-medium">{strategyInfo.find((x) => x.id === s)?.name}</TableCell>
                            <TableCell className="tnum">{formatDate(r.debtFreeDate, 'MMM yyyy')}</TableCell>
                            <TableCell className="text-right tnum">{r.months}</TableCell>
                            <TableCell className="text-right tnum">{formatCurrency(r.totalInterest, { decimals: 0 })}</TableCell>
                            <TableCell className="text-right tnum text-success">{formatCurrency(r.interestSaved, { decimals: 0 })}</TableCell>
                            <TableCell className="text-sm">{r.firstDebtPaidOff ?? '—'}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Monthly schedule */}
              <Card className="shadow-card">
                <CardHeader><CardTitle className="text-base">Monthly payoff schedule — first 24 months</CardTitle></CardHeader>
                <CardContent className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Debt</TableHead>
                        <TableHead className="text-right">Start</TableHead>
                        <TableHead className="text-right">Interest</TableHead>
                        <TableHead className="text-right">Minimum</TableHead>
                        <TableHead className="text-right">Extra</TableHead>
                        <TableHead className="text-right">End</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {active.timeline.slice(0, 24).flatMap((m) =>
                        m.rows.map((r) => (
                          <TableRow key={`${m.month}-${r.debtId}`} className={cn(r.endingBalance <= 0.004 && 'bg-success-muted/40')}>
                            <TableCell className="tnum">{format(parseISO(`${m.month}-01`), 'MMM yy')}</TableCell>
                            <TableCell className="max-w-36 truncate text-sm">{r.debtName}{r.endingBalance <= 0.004 && ' 🎉'}</TableCell>
                            <TableCell className="text-right tnum">{formatCurrency(r.startingBalance, { decimals: 0 })}</TableCell>
                            <TableCell className="text-right tnum">{formatCurrency(r.interest, { decimals: 0 })}</TableCell>
                            <TableCell className="text-right tnum">{formatCurrency(r.minimumPaid, { decimals: 0 })}</TableCell>
                            <TableCell className="text-right tnum text-primary">{r.extraPaid > 0 ? formatCurrency(r.extraPaid, { decimals: 0 }) : '—'}</TableCell>
                            <TableCell className="text-right tnum font-medium">{formatCurrency(r.endingBalance, { decimals: 0 })}</TableCell>
                          </TableRow>
                        )))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />Back
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)} disabled={step === 1 && selected.length === 0}>
            Continue<ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={openSaveDialog}>Save this plan<Check className="ml-1.5 h-4 w-4" /></Button>
        )}
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Name this payoff plan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="scenario-name">Plan name</Label>
              <Input id="scenario-name" value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} placeholder="e.g. Avalanche + $200/mo" />
            </div>
            <Button className="w-full" disabled={!scenarioName.trim() || savePayoffScenario.isPending} onClick={savePlan}>
              Save plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
