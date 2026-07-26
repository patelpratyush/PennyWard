'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line,
  LineChart, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { Copy, Download, GitCompareArrows, RotateCcw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/stores/useStore'
import { PageHeader } from '@/components/shared/Misc'
import { AnimatedMoney } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { calculateAffordability, calculateCarLoan } from '@/lib/finance/carLoan'
import { monthlyPayment } from '@/lib/finance/loans'
import { downloadCSV, formatCurrency, formatDate, round2 } from '@/lib/format'
import { defaultCarScenario } from '@/data/sampleData'
import { cn } from '@/lib/utils'

const defaults = { ...defaultCarScenario(), startDate: defaultCarScenario().startDate }

function MoneyInput({ label, value, onChange, prefix = '$', step = '1' }: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string; step?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>
        <Input type="number" step={step} min="0" className="pl-7 tnum" value={value || ''} onChange={(e) => onChange(Number(e.target.value))} />
      </div>
    </div>
  )
}

export default function CarCalculator() {
  const router = useRouter()
  const { addScenario, addDebt, pushNotification } = useStore()
  const [i, setI] = useState(defaults)
  const [aff, setAff] = useState({ grossIncome: 7200, netIncome: 5400, existingDebtPayments: 952, insurance: 165, fuel: 170, maintenance: 60, parkingTolls: 40 })

  const set = (patch: Partial<typeof i>) => setI((prev) => ({ ...prev, ...patch }))

  const r = useMemo(() => calculateCarLoan(i), [i])
  const affordability = useMemo(() => calculateAffordability(r.standardMonthlyPayment, aff), [r.standardMonthlyPayment, aff])

  const yearly = useMemo(() => {
    const years: { year: string; principal: number; interest: number }[] = []
    for (const row of r.schedule) {
      const y = row.date.slice(0, 4)
      const bucket = years.find((x) => x.year === y)
      if (bucket) { bucket.principal = round2(bucket.principal + row.principal); bucket.interest = round2(bucket.interest + row.interest) }
      else years.push({ year: y, principal: row.principal, interest: row.interest })
    }
    return years
  }, [r.schedule])

  const balanceSeries = useMemo(
    () => r.schedule.filter((_, idx) => idx % Math.max(1, Math.ceil(r.schedule.length / 60)) === 0 || idx === r.schedule.length - 1),
    [r.schedule])

  const standardSchedule = useMemo(() => calculateCarLoan({ ...i, extraMonthly: 0, oneTimePayment: 0 }), [i])
  const accelVsStandard = useMemo(() => {
    const len = Math.max(r.schedule.length, standardSchedule.schedule.length)
    const stepSize = Math.max(1, Math.ceil(len / 60))
    const rows: { n: number; standard: number; accelerated: number }[] = []
    for (let k = 0; k < len; k += stepSize) {
      rows.push({
        n: k + 1,
        standard: standardSchedule.schedule[k]?.endingBalance ?? 0,
        accelerated: r.schedule[k]?.endingBalance ?? 0,
      })
    }
    return rows
  }, [r, standardSchedule])

  const termComparison = useMemo(() => [36, 48, 60, 72, 84].map((term) => {
    const pmt = monthlyPayment(r.amountFinanced, i.apr, term)
    const total = round2(pmt * term)
    return { term: `${term} mo`, payment: pmt, interest: round2(total - r.amountFinanced) }
  }), [r.amountFinanced, i.apr])

  const saveScenario = (duplicate = false) => {
    const id = addScenario({ ...i, name: duplicate ? `${i.name || 'Scenario'} (copy)` : i.name || `Vehicle scenario ${format(new Date(), 'MMM d')}`, kind: 'car', preferred: false })
    toast.success(duplicate ? 'Scenario duplicated.' : 'Scenario saved.')
    return id
  }

  const exportAmortization = () => {
    downloadCSV(
      'finpilot-amortization.csv',
      ['Payment #', 'Date', 'Starting balance', 'Scheduled', 'Extra', 'Total', 'Principal', 'Interest', 'Ending balance'],
      r.schedule.map((row) => [row.paymentNumber, row.date, row.startingBalance, row.scheduledPayment, row.extraPayment, row.totalPayment, row.principal, row.interest, row.endingBalance]),
    )
    toast.success('Amortization schedule exported to CSV.')
  }

  return (
    <div>
      <PageHeader
        title="Car-loan calculator"
        description="The true cost of a vehicle — taxes, fees, financing, and the power of extra payments."
        actions={
          <>
            <Button variant="outline" onClick={() => { saveScenario(); router.push('/app/loans/scenarios') }}><GitCompareArrows className="mr-1.5 h-4 w-4" />Compare scenarios</Button>
            <Button variant="outline" onClick={exportAmortization}><Download className="mr-1.5 h-4 w-4" />Export schedule</Button>
            <Button variant="outline" onClick={() => setI(defaults)}><RotateCcw className="mr-1.5 h-4 w-4" />Reset</Button>
            <Button onClick={() => saveScenario()}><Save className="mr-1.5 h-4 w-4" />Save scenario</Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Inputs */}
        <div className="space-y-5 lg:col-span-2">
          <Card className="shadow-card">
            <CardHeader className="pb-3"><CardTitle className="text-base">Vehicle & deal</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="scn-name" className="text-xs">Scenario name</Label>
                <Input id="scn-name" value={i.name} onChange={(e) => set({ name: e.target.value })} />
              </div>
              <MoneyInput label="Vehicle price" value={i.vehiclePrice} onChange={(v) => set({ vehiclePrice: v })} />
              <div className="space-y-2">
                <Label className="text-xs tnum">Down payment — {formatCurrency(i.downPayment, { decimals: 0 })}</Label>
                <Slider value={[i.downPayment]} min={0} max={Math.max(20000, i.vehiclePrice)} step={250} onValueChange={([v]) => set({ downPayment: v })} aria-label="Down payment" />
              </div>
              <MoneyInput label="Trade-in value" value={i.tradeInValue} onChange={(v) => set({ tradeInValue: v })} />
              <MoneyInput label="Owed on trade-in" value={i.tradeInOwed} onChange={(v) => set({ tradeInOwed: v })} />
              <MoneyInput label="Cash rebate" value={i.rebate} onChange={(v) => set({ rebate: v })} />
              <MoneyInput label="Sales tax rate" value={i.taxRate} onChange={(v) => set({ taxRate: v })} prefix="%" step="0.01" />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3"><CardTitle className="text-base">Fees</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <MoneyInput label="Documentation" value={i.docFee} onChange={(v) => set({ docFee: v })} />
              <MoneyInput label="Registration" value={i.registrationFee} onChange={(v) => set({ registrationFee: v })} />
              <MoneyInput label="Destination" value={i.destinationFee} onChange={(v) => set({ destinationFee: v })} />
              <MoneyInput label="Other dealer fees" value={i.dealerFees} onChange={(v) => set({ dealerFees: v })} />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3"><CardTitle className="text-base">Loan terms</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs tnum">APR — {i.apr.toFixed(2)}%</Label>
                <Slider value={[i.apr]} min={0} max={20} step={0.05} onValueChange={([v]) => set({ apr: round2(v) })} aria-label="APR" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs tnum">Term — {i.termMonths} months</Label>
                <Slider value={[i.termMonths]} min={12} max={84} step={6} onValueChange={([v]) => set({ termMonths: v })} aria-label="Loan term" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs tnum">Extra monthly payment — {formatCurrency(i.extraMonthly, { decimals: 0 })}</Label>
                <Slider value={[i.extraMonthly]} min={0} max={1000} step={10} onValueChange={([v]) => set({ extraMonthly: v })} aria-label="Extra monthly payment" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">First payment date</Label>
                  <Input type="date" value={i.startDate} onChange={(e) => set({ startDate: e.target.value })} />
                </div>
                <MoneyInput label="One-time principal payment" value={i.oneTimePayment} onChange={(v) => set({ oneTimePayment: v })} />
              </div>
            </CardContent>
          </Card>

          {/* Affordability */}
          <Card className="shadow-card">
            <CardHeader className="pb-3"><CardTitle className="text-base">Can I afford it?</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <MoneyInput label="Gross monthly income" value={aff.grossIncome} onChange={(v) => setAff({ ...aff, grossIncome: v })} />
                <MoneyInput label="Net monthly income" value={aff.netIncome} onChange={(v) => setAff({ ...aff, netIncome: v })} />
                <MoneyInput label="Existing debt payments" value={aff.existingDebtPayments} onChange={(v) => setAff({ ...aff, existingDebtPayments: v })} />
                <MoneyInput label="Insurance estimate" value={aff.insurance} onChange={(v) => setAff({ ...aff, insurance: v })} />
                <MoneyInput label="Fuel estimate" value={aff.fuel} onChange={(v) => setAff({ ...aff, fuel: v })} />
                <MoneyInput label="Maintenance estimate" value={aff.maintenance} onChange={(v) => setAff({ ...aff, maintenance: v })} />
                <MoneyInput label="Parking & tolls" value={aff.parkingTolls} onChange={(v) => setAff({ ...aff, parkingTolls: v })} />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Payment % of net income</span><span className="font-semibold tnum">{affordability.paymentPctOfNet.toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total transport cost</span><span className="font-semibold tnum">{formatCurrency(affordability.totalTransportCost, { decimals: 0 })}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Debt-to-income</span><span className="font-semibold tnum">{affordability.dti.toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cash left monthly</span><span className={cn('font-semibold tnum', affordability.remainingCash < 0 && 'text-destructive')}>{formatCurrency(affordability.remainingCash, { decimals: 0 })}</span></div>
              </div>
              <p className={cn('rounded-lg px-3 py-2 text-center text-sm font-semibold', affordability.status === 'comfortable' && 'bg-success-muted text-success', affordability.status === 'manageable' && 'bg-info-muted text-info', affordability.status === 'high' && 'bg-warning-muted text-warning', affordability.status === 'very_high' && 'bg-destructive/10 text-destructive')}>
                {affordability.statusLabel}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Affordability estimates use common guidelines (transport under 15–20% of net income, DTI under 36%) and are educational, not financial advice.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-5 lg:col-span-3">
          {/* Deal breakdown */}
          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-base">Deal breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                {[
                  ['Vehicle price', i.vehiclePrice], ['Net trade-in', r.netTradeIn], ['Taxable amount', r.taxableAmount],
                  ['Taxes', r.taxes], ['Total fees', r.totalFees], ['Cash due at signing', r.cashDueAtSigning],
                ].map(([l, v]) => (
                  <div key={l as string} className="flex justify-between gap-2 border-b border-dashed pb-1.5">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="font-medium tnum">{formatCurrency(v as number, { decimals: 0 })}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between rounded-xl bg-accent px-4 py-3">
                <span className="font-semibold text-accent-foreground">Amount financed</span>
                <AnimatedMoney value={r.amountFinanced} className="text-lg font-bold text-accent-foreground" decimals={0} />
              </div>
            </CardContent>
          </Card>

          {/* Payment hero */}
          <motion.div layout>
            <Card className="border-primary/40 shadow-lift">
              <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Estimated monthly payment</p>
                  <AnimatedMoney value={r.standardMonthlyPayment} className="mt-1 block text-3xl font-extrabold text-primary" />
                  {i.extraMonthly > 0 && <p className="mt-1 text-xs text-muted-foreground tnum">+ {formatCurrency(i.extraMonthly, { decimals: 0 })} extra = {formatCurrency(r.standardMonthlyPayment + i.extraMonthly, { decimals: 0 })}</p>}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total interest</p>
                  <AnimatedMoney value={r.totalInterest} className="mt-1 block text-3xl font-extrabold" decimals={0} />
                  {r.interestSaved > 0 && <p className="mt-1 text-xs font-medium text-success tnum">Save {formatCurrency(r.interestSaved, { decimals: 0 })} with extra payments</p>}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Payoff date</p>
                  <p className="mt-1 text-3xl font-extrabold tnum">{formatDate(r.payoffDate, 'MMM yyyy')}</p>
                  {r.monthsSaved > 0 && <p className="mt-1 text-xs font-medium text-success tnum">{r.monthsSaved} months earlier</p>}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Totals */}
          <Card className="shadow-card">
            <CardContent className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
              {[
                ['Total principal', r.amountFinanced], ['Total loan payments', r.totalPaid],
                ['Total vehicle cost', r.totalVehicleCost], ['Interest saved', r.interestSaved],
              ].map(([l, v]) => (
                <div key={l as string}>
                  <p className="text-[11px] text-muted-foreground">{l}</p>
                  <AnimatedMoney value={v as number} className="mt-0.5 block text-lg font-bold" decimals={0} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Charts row 1 */}
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Principal vs. interest</CardTitle></CardHeader>
              <CardContent>
                <div className="relative mx-auto h-44 w-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[{ name: 'Principal', value: r.amountFinanced }, { name: 'Interest', value: r.totalInterest }]}
                        dataKey="value" innerRadius={50} outerRadius={78} strokeWidth={0} paddingAngle={2}
                      >
                        <Cell fill="hsl(var(--chart-1))" /><Cell fill="hsl(var(--chart-4))" />
                      </Pie>
                      <RTooltip formatter={(v: number) => formatCurrency(v, { decimals: 0 })} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">Total paid</span>
                    <span className="text-sm font-bold tnum">{formatCurrency(r.totalPaid, { decimals: 0 })}</span>
                  </div>
                </div>
                <div className="mt-1 flex justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-chart-1" />Principal</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-chart-4" />Interest</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Remaining balance</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={balanceSeries}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => format(parseISO(v), 'MMM yy')} minTickGap={36} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={34} />
                      <RTooltip formatter={(v: number) => formatCurrency(v, { decimals: 0 })} labelFormatter={(v) => format(parseISO(v as string), 'MMM d, yyyy')} />
                      <Area type="monotone" dataKey="endingBalance" name="Balance" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1)/0.15)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts row 2 */}
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Principal & interest by year</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} width={38} />
                      <RTooltip formatter={(v: number) => formatCurrency(v, { decimals: 0 })} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="principal" name="Principal" stackId="a" fill="hsl(var(--chart-1))" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="interest" name="Interest" stackId="a" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Standard vs. accelerated payoff</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={accelVsStandard}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="n" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: 'Payment #', position: 'insideBottom', offset: -2, fontSize: 10 }} height={28} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={34} />
                      <RTooltip formatter={(v: number) => formatCurrency(v, { decimals: 0 })} labelFormatter={(v) => `Payment ${v}`} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="standard" name="Standard" stroke="hsl(var(--chart-8))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="accelerated" name="With extra payments" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Term comparison */}
          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Loan-term comparison — same amount financed</CardTitle></CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={termComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="term" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={44} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={38} />
                    <RTooltip formatter={(v: number, name: string) => [formatCurrency(v, { decimals: 0 }), name]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="payment" name="Monthly payment" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="interest" name="Total interest" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="shadow-card">
            <CardContent className="flex flex-wrap gap-2 p-4">
              <Button variant="outline" onClick={() => saveScenario(true)}><Copy className="mr-1.5 h-4 w-4" />Duplicate scenario</Button>
              <Button variant="outline" onClick={() => {
                addDebt({
                  name: i.name || 'New auto loan', lender: 'Auto lender', type: 'auto_loan',
                  balance: r.amountFinanced, originalBalance: r.amountFinanced, apr: i.apr,
                  minimumPayment: r.standardMonthlyPayment, dueDay: Number(i.startDate.slice(8, 10)) || 15,
                })
                pushNotification({ type: 'debt', title: 'Loan created', message: `${i.name || 'Auto loan'} was added to your debts.` })
                toast.success('Active loan created from this scenario.')
                router.push('/app/debt')
              }}>Create active loan</Button>
              <Button variant="outline" onClick={() => {
                const id = saveScenario()
                router.push(`/app/loans/${id}/amortization`)
              }}>View amortization schedule</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
