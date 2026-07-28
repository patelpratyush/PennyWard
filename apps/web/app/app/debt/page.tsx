'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Calculator, CreditCard, GitCompareArrows, MoreHorizontal, Pencil, Plus, Trash2, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useDebts, useCreateDebt, useUpdateDebt, useDeleteDebt } from '@/hooks/queries/useDebts'
import { PageHeader } from '@/components/shared/Misc'
import { EmptyState, LoadingSkeleton } from '@/components/shared/States'
import { Money } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { monthlyPayment } from '@/lib/finance/loans'
import { simulatePayoff } from '@/lib/finance/debt'
import { formatCurrency, formatDate, round2 } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Debt, DebtType } from '@/types'

const debtTypeLabels: Record<DebtType, string> = {
  credit_card: 'Credit card', auto_loan: 'Auto loan', student_loan: 'Student loan',
  personal_loan: 'Personal loan', mortgage: 'Mortgage', medical: 'Medical debt',
  bnpl: 'Buy now, pay later', other: 'Other debt',
}

export function DebtDialog({ open, onOpenChange, editing }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing?: Debt | null
}) {
  const createDebt = useCreateDebt()
  const updateDebtMut = useUpdateDebt()
  const [form, setForm] = useState({
    name: '', lender: '', type: 'credit_card' as DebtType, balance: '', originalBalance: '',
    apr: '', minimumPayment: '', dueDay: '1', creditLimit: '',
  })

  useEffect(() => {
    if (open) {
      setForm({
        name: editing?.name ?? '', lender: editing?.lender ?? '', type: editing?.type ?? 'credit_card',
        balance: editing ? String(editing.balance) : '', originalBalance: editing ? String(editing.originalBalance) : '',
        apr: editing ? String(editing.apr) : '', minimumPayment: editing ? String(editing.minimumPayment) : '',
        dueDay: editing ? String(editing.dueDay) : '1', creditLimit: editing?.creditLimit ? String(editing.creditLimit) : '',
      })
    }
  }, [open, editing])

  const valid = form.name.trim().length > 1 && Number(form.balance) > 0 && Number(form.minimumPayment) >= 0 && form.apr !== ''

  const save = () => {
    const balance = round2(Number(form.balance))
    const payload = {
      name: form.name.trim(), lender: form.lender.trim() || form.name.trim(), type: form.type,
      balance, originalBalance: round2(Number(form.originalBalance) || balance),
      apr: Number(form.apr), minimumPayment: round2(Number(form.minimumPayment)),
      dueDay: Math.min(31, Math.max(1, Number(form.dueDay) || 1)),
      creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined,
    }
    if (editing) {
      updateDebtMut.mutate({ id: editing.id, patch: payload }, {
        onSuccess: () => toast.success('Debt updated.'),
        onError: () => toast.error('Could not update this debt.'),
      })
    } else {
      createDebt.mutate(payload, {
        onSuccess: () => toast.success('Debt added.'),
        onError: () => toast.error('Could not add this debt.'),
      })
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? 'Edit debt' : 'Add debt'}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="debt-name">Debt name</Label>
            <Input id="debt-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Capital One card" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="debt-lender">Lender</Label>
            <Input id="debt-lender" value={form.lender} onChange={(e) => setForm({ ...form, lender: e.target.value })} placeholder="e.g. Capital One" />
          </div>
          <div className="space-y-1.5">
            <Label>Debt type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as DebtType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(debtTypeLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="debt-balance">Current balance ($)</Label>
            <Input id="debt-balance" type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="debt-orig">Original balance ($)</Label>
            <Input id="debt-orig" type="number" value={form.originalBalance} onChange={(e) => setForm({ ...form, originalBalance: e.target.value })} placeholder="Same as current if new" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="debt-apr">Interest rate APR (%)</Label>
            <Input id="debt-apr" type="number" step="0.01" min="0" max="100" value={form.apr} onChange={(e) => setForm({ ...form, apr: e.target.value })} />
            {Number(form.apr) > 100 && <p className="text-xs text-destructive">Enter an interest rate between 0% and 100%.</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="debt-min">Minimum payment ($/mo)</Label>
            <Input id="debt-min" type="number" value={form.minimumPayment} onChange={(e) => setForm({ ...form, minimumPayment: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="debt-due">Due day of month</Label>
            <Input id="debt-due" type="number" min="1" max="31" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} />
          </div>
          {form.type === 'credit_card' && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="debt-limit">Credit limit ($)</Label>
              <Input id="debt-limit" type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
            </div>
          )}
        </div>
        <Button className="mt-4 w-full" disabled={!valid || Number(form.apr) > 100} onClick={save}>
          {editing ? 'Save changes' : 'Add debt'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

function DebtPageInner() {
  const { data: debts = [], isLoading } = useDebts()
  const updateDebtMut = useUpdateDebt()
  const deleteDebtMut = useDeleteDebt()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [paying, setPaying] = useState<Debt | null>(null)
  const [payAmount, setPayAmount] = useState('')

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setEditing(null)
      setDialogOpen(true)
      const next = new URLSearchParams(searchParams.toString())
      next.delete('add')
      router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname)
    }
  }, [searchParams, pathname, router])

  const month = format(new Date(), 'yyyy-MM')
  const summary = useMemo(() => {
    const total = round2(debts.reduce((s, d) => s + d.balance, 0))
    const minimums = round2(debts.reduce((s, d) => s + d.minimumPayment, 0))
    const weightedApr = total > 0 ? round2(debts.reduce((s, d) => s + d.apr * d.balance, 0) / total) : 0
    const plan = debts.length ? simulatePayoff({ debts, strategy: 'minimum', extraMonthly: 0, oneTimePayment: 0, startMonth: month }) : null
    return { total, minimums, weightedApr, plan }
  }, [debts, month])

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Debt & Loans" description="Every balance, every rate, and the plan to zero." />
        <LoadingSkeleton rows={4} className="mt-6" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Debt & Loans"
        description="Every balance, every rate, and the plan to zero."
        actions={
          <>
            <Button asChild variant="outline"><Link href="/app/loans/car-calculator"><Calculator className="mr-1.5 h-4 w-4" />Calculate loan</Link></Button>
            <Button asChild variant="outline"><Link href="/app/debt/payoff-planner"><GitCompareArrows className="mr-1.5 h-4 w-4" />Compare strategies</Link></Button>
            <Button asChild><Link href="/app/debt/payoff-planner"><TrendingDown className="mr-1.5 h-4 w-4" />Create payoff plan</Link></Button>
            <Button variant="outline" onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="mr-1.5 h-4 w-4" />Add debt</Button>
          </>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">Total debt</p><Money value={summary.total} className="mt-1 block text-xl font-bold" decimals={0} /></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">Monthly minimums</p><Money value={summary.minimums} className="mt-1 block text-xl font-bold" decimals={0} /></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">Weighted avg APR</p><p className="mt-1 text-xl font-bold tnum">{summary.weightedApr.toFixed(2)}%</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">Debt-free (minimums)</p><p className="mt-1 text-xl font-bold tnum">{summary.plan ? formatDate(summary.plan.debtFreeDate, 'MMM yyyy') : '—'}</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">Interest remaining</p><Money value={summary.plan?.totalInterest ?? 0} className="mt-1 block text-xl font-bold" decimals={0} /></CardContent></Card>
      </div>

      {/* Debt cards */}
      {debts.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<CreditCard className="h-6 w-6" />}
            title="Add at least one debt to create a personalized payoff plan"
            description="Credit cards, auto loans, student loans — add them all to see your debt-free date."
            actionLabel="Add debt"
            onAction={() => setDialogOpen(true)}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {debts.map((d) => {
            const progress = d.originalBalance > 0 ? Math.min(100, ((d.originalBalance - d.balance) / d.originalBalance) * 100) : 0
            const estPayment = Math.max(d.minimumPayment, monthlyPayment(d.balance, d.apr, 60))
            const months = estPayment > 0 ? Math.ceil(d.balance / Math.max(1, estPayment - (d.balance * d.apr) / 1200)) : 0
            const payoff = new Date()
            payoff.setMonth(payoff.getMonth() + Math.min(600, months))
            return (
              <Card key={d.id} className="shadow-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                        <CreditCard className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.lender} · {debtTypeLabels[d.type]}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`${d.name} actions`}><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setPaying(d); setPayAmount(String(d.minimumPayment)) }}>Record payment</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditing(d); setDialogOpen(true) }}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => {
                          deleteDebtMut.mutate(d.id, {
                            onSuccess: () => toast.success('Debt removed.'),
                            onError: () => toast.error('Could not remove this debt.'),
                          })
                        }}>
                          <Trash2 className="mr-2 h-4 w-4" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <Money value={d.balance} className="text-2xl font-bold" decimals={0} />
                    <span className="text-xs text-muted-foreground tnum">of {formatCurrency(d.originalBalance, { decimals: 0 })} original</span>
                  </div>
                  <Progress value={progress} className="mt-2 h-2" />
                  <p className="mt-1 text-xs text-muted-foreground tnum">{progress.toFixed(0)}% paid off</p>

                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">APR</span><span className="font-medium tnum">{d.apr}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Minimum</span><Money value={d.minimumPayment} className="font-medium" decimals={0} /></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Due day</span><span className="font-medium tnum">{d.dueDay}{['st','nd','rd'][((d.dueDay % 10) - 1)] ?? 'th'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Est. payoff</span><span className="font-medium tnum">{format(payoff, 'MMM yyyy')}</span></div>
                    {d.creditLimit && (
                      <div className="col-span-2 flex justify-between">
                        <span className="text-muted-foreground">Utilization</span>
                        <span className={cn('font-medium tnum', d.balance / d.creditLimit > 0.3 ? 'text-warning' : 'text-success')}>
                          {Math.round((d.balance / d.creditLimit) * 100)}% of {formatCurrency(d.creditLimit, { decimals: 0 })}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <DebtDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />

      {/* Record payment */}
      <Dialog open={!!paying} onOpenChange={() => setPaying(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record payment — {paying?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">This reduces the tracked balance. Add the matching transaction from Quick add if you want it in your spending records.</p>
            <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} aria-label="Payment amount" />
            <Button className="w-full" disabled={!(Number(payAmount) > 0)} onClick={() => {
              if (paying) {
                const amount = Number(payAmount)
                updateDebtMut.mutate({ id: paying.id, patch: { balance: round2(Math.max(0, paying.balance - amount)) } }, {
                  onSuccess: () => toast.success(`Payment of ${formatCurrency(amount)} recorded.`),
                  onError: () => toast.error('Could not record this payment.'),
                })
              }
              setPaying(null)
            }}>Record payment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function DebtPagePage() {
  return (
    <Suspense fallback={null}>
      <DebtPageInner />
    </Suspense>
  )
}
