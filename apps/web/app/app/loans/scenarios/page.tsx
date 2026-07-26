'use client'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { Copy, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useStore } from '@/stores/useStore'
import { PageHeader } from '@/components/shared/Misc'
import { EmptyState } from '@/components/shared/States'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { calculateCarLoan } from '@/lib/finance/carLoan'
import { calculateStandardLoan } from '@/lib/finance/loans'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { LoanScenario } from '@/types'

interface Row {
  scenario: LoanScenario
  financed: number
  payment: number
  interest: number
  totalPaid: number
  payoffDate: string
  cashDue: number
}

export default function Scenarios() {
  const router = useRouter()
  const { scenarios, updateScenario, deleteScenario, addScenario, addDebt } = useStore()

  const rows: Row[] = useMemo(() => scenarios.slice(0, 5).map((s) => {
    if (s.kind === 'car') {
      const r = calculateCarLoan(s)
      return { scenario: s, financed: r.amountFinanced, payment: r.standardMonthlyPayment, interest: r.totalInterest, totalPaid: r.totalPaid, payoffDate: r.payoffDate, cashDue: r.cashDueAtSigning }
    }
    const r = calculateStandardLoan(s.loanAmount, s.apr, s.termMonths, s.startDate)
    return { scenario: s, financed: s.loanAmount, payment: r.monthlyPayment, interest: r.totalInterest, totalPaid: r.totalPaid, payoffDate: r.payoffDate, cashDue: 0 }
  }), [scenarios])

  const best = useMemo(() => ({
    payment: Math.min(...rows.map((r) => r.payment)),
    interest: Math.min(...rows.map((r) => r.interest)),
    total: Math.min(...rows.map((r) => r.totalPaid)),
    payoff: rows.map((r) => r.payoffDate).sort()[0],
    upfront: Math.min(...rows.map((r) => r.cashDue)),
  }), [rows])

  const chartData = rows.map((r) => ({
    name: r.scenario.name.length > 14 ? `${r.scenario.name.slice(0, 14)}…` : r.scenario.name,
    'Monthly payment': r.payment,
    'Total interest': r.interest,
  }))

  return (
    <div>
      <PageHeader
        title="Loan scenario comparison"
        description="Compare up to five scenarios side by side — best values are highlighted."
        actions={<Button onClick={() => router.push('/app/loans/car-calculator')}><Plus className="mr-1.5 h-4 w-4" />Add scenario</Button>}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No saved scenarios yet"
          description="Build a car-loan or general-loan scenario and save it to compare options here."
          actionLabel="Open car-loan calculator"
          actionHref="/app/loans/car-calculator"
        />
      ) : (
        <>
          <Card className="shadow-card">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-44">Scenario</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Down</TableHead>
                    <TableHead className="text-right">Financed</TableHead>
                    <TableHead className="text-right">APR</TableHead>
                    <TableHead className="text-right">Term</TableHead>
                    <TableHead className="text-right">Payment</TableHead>
                    <TableHead className="text-right">Interest</TableHead>
                    <TableHead className="text-right">Total paid</TableHead>
                    <TableHead className="text-right">Payoff</TableHead>
                    <TableHead className="text-right">Due at signing</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const s = r.scenario
                    const price = s.kind === 'car' ? s.vehiclePrice : s.loanAmount
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { updateScenario(s.id, { preferred: !s.preferred }); toast.success(s.preferred ? 'Removed preferred mark.' : 'Marked as preferred.') }}
                              aria-label="Toggle preferred scenario"
                              className={cn('rounded-full p-1', s.preferred ? 'text-warning' : 'text-muted-foreground/40 hover:text-warning')}
                            >
                              <Star className="h-4 w-4" fill={s.preferred ? 'currentColor' : 'none'} />
                            </button>
                            <div>
                              <p className="font-medium">{s.name}</p>
                              <p className="text-xs text-muted-foreground">{s.kind === 'car' ? 'Car loan' : 'General loan'} · saved {format(new Date(s.createdAt), 'MMM d')}</p>
                            </div>
                            {s.preferred && <Badge className="bg-warning-muted text-warning">Preferred</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tnum">{formatCurrency(price, { decimals: 0 })}</TableCell>
                        <TableCell className="text-right tnum">{formatCurrency(s.downPayment, { decimals: 0 })}</TableCell>
                        <TableCell className="text-right tnum">{formatCurrency(r.financed, { decimals: 0 })}</TableCell>
                        <TableCell className="text-right tnum">{s.apr.toFixed(2)}%</TableCell>
                        <TableCell className="text-right tnum">{s.termMonths} mo</TableCell>
                        <TableCell className={cn('text-right font-semibold tnum', r.payment === best.payment && 'text-success')}>
                          {formatCurrency(r.payment, { decimals: 0 })}
                          {r.payment === best.payment && rows.length > 1 && <span className="block text-[10px] font-normal">lowest payment</span>}
                        </TableCell>
                        <TableCell className={cn('text-right tnum', r.interest === best.interest && 'font-semibold text-success')}>
                          {formatCurrency(r.interest, { decimals: 0 })}
                          {r.interest === best.interest && rows.length > 1 && <span className="block text-[10px] font-normal">lowest interest</span>}
                        </TableCell>
                        <TableCell className={cn('text-right tnum', r.totalPaid === best.total && 'font-semibold text-success')}>
                          {formatCurrency(r.totalPaid, { decimals: 0 })}
                        </TableCell>
                        <TableCell className={cn('text-right tnum', r.payoffDate === best.payoff && 'font-semibold text-success')}>
                          {formatDate(r.payoffDate, 'MMM yyyy')}
                          {r.payoffDate === best.payoff && rows.length > 1 && <span className="block text-[10px] font-normal">fastest</span>}
                        </TableCell>
                        <TableCell className={cn('text-right tnum', r.cashDue === best.upfront && rows.length > 1 && 'font-semibold text-success')}>
                          {formatCurrency(r.cashDue, { decimals: 0 })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-0.5">
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Duplicate scenario"
                              onClick={() => { addScenario({ ...s, name: `${s.name} (copy)`, preferred: false }); toast.success('Scenario duplicated.') }}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit scenario"
                              onClick={() => router.push(s.kind === 'car' ? '/app/loans/car-calculator' : '/app/loans/calculator')}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Delete scenario"
                              onClick={() => { deleteScenario(s.id); toast.success('Scenario deleted.') }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Payments & interest compared</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} width={40} />
                      <RTooltip formatter={(v: number) => formatCurrency(v, { decimals: 0 })} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Monthly payment" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Total interest" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Turn a scenario into a plan</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {rows.map((r) => (
                  <div key={r.scenario.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div>
                      <p className="text-sm font-medium">{r.scenario.name}</p>
                      <p className="text-xs text-muted-foreground tnum">{formatCurrency(r.payment, { decimals: 0 })}/mo · {r.scenario.termMonths} months</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => {
                      addDebt({
                        name: r.scenario.name, lender: r.scenario.kind === 'car' ? 'Auto lender' : 'Lender',
                        type: r.scenario.kind === 'car' ? 'auto_loan' : 'personal_loan',
                        balance: r.financed, originalBalance: r.financed, apr: r.scenario.apr,
                        minimumPayment: r.payment, dueDay: Number(r.scenario.startDate.slice(8, 10)) || 15,
                      })
                      toast.success('Converted to an active loan in Debt & Loans.')
                      router.push('/app/debt')
                    }}>
                      Create active loan
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
