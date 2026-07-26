'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/stores/useStore'
import { PageHeader } from '@/components/shared/Misc'
import { AnimatedMoney } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { calculateLoan } from '@/lib/finance/loans'
import { formatCurrency, formatDate, round2 } from '@/lib/format'

export default function LoanCalculator() {
  const router = useRouter()
  const addScenario = useStore((s) => s.addScenario)
  const [i, setI] = useState({
    type: 'personal', loanAmount: 15000, apr: 9.5, termMonths: 48,
    startDate: format(new Date(), 'yyyy-MM-dd'), extraMonthly: 0, oneTimePayment: 0,
  })
  const set = (patch: Partial<typeof i>) => setI((p) => ({ ...p, ...patch }))

  const r = useMemo(() => calculateLoan({
    principal: i.loanAmount, apr: i.apr, termMonths: i.termMonths,
    startDate: i.startDate, extraMonthly: i.extraMonthly, oneTimePayment: i.oneTimePayment,
  }), [i])

  const save = () => {
    addScenario({
      name: `${i.type === 'personal' ? 'Personal' : i.type === 'student' ? 'Student' : i.type === 'mortgage' ? 'Mortgage-style' : 'Custom'} loan — ${formatCurrency(i.loanAmount, { decimals: 0 })}`,
      preferred: false, kind: 'general',
      vehiclePrice: 0, downPayment: 0, tradeInValue: 0, tradeInOwed: 0, rebate: 0,
      taxRate: 0, docFee: 0, registrationFee: 0, destinationFee: 0, dealerFees: 0,
      loanAmount: i.loanAmount, apr: i.apr, termMonths: i.termMonths,
      startDate: i.startDate, extraMonthly: i.extraMonthly, oneTimePayment: i.oneTimePayment,
    })
    toast.success('Scenario saved.')
    router.push('/app/loans/scenarios')
  }

  return (
    <div>
      <PageHeader
        title="Loan calculator"
        description="Personal, student, mortgage-style, and custom installment loans."
        actions={<Button onClick={save}><Save className="mr-1.5 h-4 w-4" />Save scenario</Button>}
      />

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base">Loan details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Loan type</Label>
              <Select value={i.type} onValueChange={(v) => set({ type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal loan</SelectItem>
                  <SelectItem value="student">Student loan</SelectItem>
                  <SelectItem value="mortgage">Fixed-rate mortgage-style loan</SelectItem>
                  <SelectItem value="custom">Custom installment loan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs tnum">Loan amount — {formatCurrency(i.loanAmount, { decimals: 0 })}</Label>
              <Slider value={[i.loanAmount]} min={500} max={500000} step={500} onValueChange={([v]) => set({ loanAmount: v })} aria-label="Loan amount" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs tnum">APR — {i.apr.toFixed(2)}%</Label>
              <Slider value={[i.apr]} min={0} max={30} step={0.05} onValueChange={([v]) => set({ apr: round2(v) })} aria-label="APR" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs tnum">Term — {i.termMonths} months</Label>
              <Slider value={[i.termMonths]} min={6} max={360} step={6} onValueChange={([v]) => set({ termMonths: v })} aria-label="Term" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">First payment date</Label>
                <Input type="date" value={i.startDate} onChange={(e) => set({ startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">One-time payment</Label>
                <Input type="number" min="0" value={i.oneTimePayment || ''} placeholder="0" onChange={(e) => set({ oneTimePayment: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs tnum">Extra monthly payment — {formatCurrency(i.extraMonthly, { decimals: 0 })}</Label>
              <Slider value={[i.extraMonthly]} min={0} max={2000} step={10} onValueChange={([v]) => set({ extraMonthly: v })} aria-label="Extra monthly payment" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5 lg:col-span-3">
          <Card className="border-primary/40 shadow-lift">
            <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Monthly payment</p>
                <AnimatedMoney value={r.monthlyPayment} className="mt-1 block text-3xl font-extrabold text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total interest</p>
                <AnimatedMoney value={r.totalInterest} className="mt-1 block text-3xl font-extrabold" decimals={0} />
                {r.interestSaved > 0 && <p className="mt-1 text-xs font-medium text-success tnum">{formatCurrency(r.interestSaved, { decimals: 0 })} saved with extras</p>}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Payoff date</p>
                <p className="mt-1 text-3xl font-extrabold tnum">{formatDate(r.payoffDate, 'MMM yyyy')}</p>
                {r.monthsSaved > 0 && <p className="mt-1 text-xs font-medium text-success tnum">{r.monthsSaved} months earlier</p>}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Principal vs. interest</CardTitle></CardHeader>
              <CardContent>
                <div className="mx-auto h-44 w-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{ name: 'Principal', value: i.loanAmount }, { name: 'Interest', value: r.totalInterest }]}
                        dataKey="value" innerRadius={50} outerRadius={78} strokeWidth={0} paddingAngle={2}>
                        <Cell fill="hsl(var(--chart-1))" /><Cell fill="hsl(var(--chart-4))" />
                      </Pie>
                      <RTooltip formatter={(v: number) => formatCurrency(v, { decimals: 0 })} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-center text-sm text-muted-foreground tnum">Total paid: <span className="font-semibold text-foreground">{formatCurrency(r.totalPaid, { decimals: 0 })}</span></p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Balance over time</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={r.schedule.filter((_, k) => k % Math.max(1, Math.ceil(r.schedule.length / 50)) === 0)}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => format(parseISO(v), 'MMM yy')} minTickGap={36} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={34} />
                      <RTooltip formatter={(v: number) => formatCurrency(v, { decimals: 0 })} labelFormatter={(v) => format(parseISO(v as string), 'MMM yyyy')} />
                      <Area type="monotone" dataKey="endingBalance" name="Balance" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1)/0.15)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Amortization preview */}
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Amortization preview — first 12 payments</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead><TableHead>Date</TableHead>
                    <TableHead className="text-right">Payment</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Interest</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.schedule.slice(0, 12).map((row) => (
                    <TableRow key={row.paymentNumber}>
                      <TableCell className="tnum">{row.paymentNumber}</TableCell>
                      <TableCell className="tnum">{formatDate(row.date, 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right tnum">{formatCurrency(row.totalPayment)}</TableCell>
                      <TableCell className="text-right tnum">{formatCurrency(row.principal)}</TableCell>
                      <TableCell className="text-right tnum">{formatCurrency(row.interest)}</TableCell>
                      <TableCell className="text-right tnum font-medium">{formatCurrency(row.endingBalance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
