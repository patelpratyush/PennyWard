'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  addDays, addMonths, endOfMonth, format, isBefore, isSameDay, parseISO, startOfMonth,
} from 'date-fns'
import {
  ArrowDownLeft, CalendarDays, ChevronLeft, ChevronRight, History, MoreHorizontal,
  Pencil, Plus, Repeat, Trash2, Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/stores/useStore'
import { PageHeader, StatusBadge } from '@/components/shared/Misc'
import { EmptyState } from '@/components/shared/States'
import { Money } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatDate, round2 } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Bill, BillFrequency } from '@/types'

function nextDue(day: number, paid: string[], skipped: string[], from = new Date()): string {
  // Find the next occurrence of `day` that isn't paid or skipped
  let candidate = new Date(from.getFullYear(), from.getMonth(), day)
  for (let k = 0; k < 24; k++) {
    const key = format(candidate, 'yyyy-MM-dd')
    if (!paid.includes(key) && !skipped.includes(key) && candidate >= new Date(from.getFullYear(), from.getMonth(), from.getDate())) return key
    candidate = addMonths(candidate, 1)
  }
  return format(candidate, 'yyyy-MM-dd')
}

const billTypes = ['rent', 'mortgage', 'car', 'credit_card', 'student_loan', 'insurance', 'utilities', 'subscription', 'salary', 'savings_transfer', 'other']
const frequencies: { value: BillFrequency; label: string }[] = [
  { value: 'once', label: 'One time' }, { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every two weeks' }, { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' }, { value: 'semiannual', label: 'Semiannual' }, { value: 'annual', label: 'Annual' },
]

function BillDialog({ open, onOpenChange, editing }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing?: Bill | null
}) {
  const { accounts, addBill, updateBill } = useStore()
  const [form, setForm] = useState({
    name: '', type: 'utilities', amount: '', dueDay: '1', accountId: '',
    autopay: false, frequency: 'monthly' as BillFrequency, isIncome: false, reminderDays: 3,
  })

  useEffect(() => {
    if (open) {
      setForm({
        name: editing?.name ?? '', type: editing?.type ?? 'utilities',
        amount: editing ? String(editing.amount) : '', dueDay: editing ? String(editing.dueDay) : '1',
        accountId: editing?.accountId ?? '', autopay: editing?.autopay ?? false,
        frequency: editing?.frequency ?? 'monthly', isIncome: editing?.isIncome ?? false,
        reminderDays: editing?.reminderDays ?? 3,
      })
    }
  }, [open, editing])

  const valid = form.name.trim().length > 1 && Number(form.amount) > 0

  const save = () => {
    const dueDay = Math.min(28, Math.max(1, Number(form.dueDay) || 1))
    const payload = {
      name: form.name.trim(), type: form.type, amount: round2(Number(form.amount)),
      dueDay, nextDueDate: editing?.nextDueDate ?? nextDue(dueDay, [], []),
      accountId: form.accountId || undefined, autopay: form.autopay,
      frequency: form.frequency, isIncome: form.isIncome, reminderDays: form.reminderDays,
    }
    if (editing) {
      updateBill(editing.id, payload)
      toast.success('Bill updated.')
    } else {
      addBill(payload)
      toast.success('Bill added.')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? 'Edit bill' : 'Add bill or income event'}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="bill-name">Name</Label>
            <Input id="bill-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Xfinity Internet" />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, isIncome: v === 'salary' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {billTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bill-amount">Amount ($)</Label>
            <Input id="bill-amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bill-day">Due day of month</Label>
            <Input id="bill-day" type="number" min="1" max="28" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Linked account</Label>
            <Select value={form.accountId || 'none'} onValueChange={(v) => setForm({ ...form, accountId: v === 'none' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {accounts.filter((a) => !a.archived).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Frequency</Label>
            <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as BillFrequency })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {frequencies.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bill-reminder">Reminder (days before)</Label>
            <Input id="bill-reminder" type="number" min="0" max="14" value={form.reminderDays} onChange={(e) => setForm({ ...form, reminderDays: Number(e.target.value) })} />
          </div>
          <div className="flex items-end gap-6 pb-1">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.autopay} onCheckedChange={(v) => setForm({ ...form, autopay: v })} aria-label="Autopay" />Autopay
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.isIncome} onCheckedChange={(v) => setForm({ ...form, isIncome: v })} aria-label="Income event" />Income
            </label>
          </div>
        </div>
        <Button className="mt-4 w-full" disabled={!valid} onClick={save}>{editing ? 'Save changes' : 'Add bill'}</Button>
      </DialogContent>
    </Dialog>
  )
}

function BillsInner() {
  const { bills, accounts, markBillPaid, skipBill, deleteBill, addTransaction, pushNotification } = useStore()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [view, setView] = useState<'upcoming' | 'calendar' | 'recurring' | 'history'>('upcoming')
  const [monthOffset, setMonthOffset] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Bill | null>(null)

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setEditing(null)
      setDialogOpen(true)
      const next = new URLSearchParams(searchParams.toString())
      next.delete('add')
      router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname)
    }
  }, [searchParams, pathname, router])

  const now = new Date()
  const calMonth = addMonths(now, monthOffset)

  const enriched = useMemo(() => bills.map((b) => {
    const due = b.nextDueDate
    const paid = b.paidDates.includes(due)
    const overdue = !paid && !b.isIncome && isBefore(parseISO(due), now)
    const soon = !paid && !overdue && isBefore(parseISO(due), addDays(now, 7))
    return { ...b, status: paid ? 'paid' : overdue ? 'overdue' : soon ? 'due' : 'upcoming' as string }
  }), [bills, now])

  const upcoming = useMemo(() => enriched.filter((b) => b.status !== 'paid').sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)), [enriched])
  const overdue = upcoming.filter((b) => b.status === 'overdue')
  const paidHistory = useMemo(
    () => bills.flatMap((b) => b.paidDates.map((d) => ({ bill: b, date: d }))).sort((a, b) => b.date.localeCompare(a.date)),
    [bills])

  const calendarDays = useMemo(() => {
    const start = startOfMonth(calMonth)
    const end = endOfMonth(calMonth)
    const startPad = start.getDay()
    const days: (Date | null)[] = Array(startPad).fill(null)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d))
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [calMonth])

  const billsOnDay = (d: Date) => enriched.filter((b) => {
    // A bill appears on its dueDay of every month (monthly) or its nextDueDate (once)
    if (b.frequency === 'once') return isSameDay(parseISO(b.nextDueDate), d)
    return d.getDate() === b.dueDay
  })

  const markPaid = (b: Bill, createTxn: boolean) => {
    markBillPaid(b.id, b.nextDueDate)
    if (createTxn && !b.isIncome) {
      addTransaction({
        accountId: b.accountId ?? accounts[0]?.id ?? '', type: 'expense', amount: b.amount,
        merchant: b.name, date: format(now, 'yyyy-MM-dd'), categoryId: b.categoryId,
        tags: ['bill'], recurring: true, cleared: true, importSource: 'manual',
      })
    }
    pushNotification({ type: 'bill', title: `${b.name} marked paid`, message: `${formatCurrency(b.amount)} was recorded for ${b.name}.` })
    toast.success(`${b.name} marked as paid.`)
  }

  const statusOf = (b: Bill & { status: string }) => b.status as 'paid' | 'overdue' | 'due' | 'upcoming'

  return (
    <div>
      <PageHeader
        title="Bills & calendar"
        description="Due dates, autopay, and income events in one place."
        actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="mr-1.5 h-4 w-4" />Add bill</Button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">Due this month</p><Money value={round2(upcoming.filter((b) => !b.isIncome).reduce((s, b) => s + b.amount, 0))} className="mt-1 block text-xl font-bold" decimals={0} /></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">Overdue</p><p className={cn('mt-1 text-xl font-bold tnum', overdue.length > 0 && 'text-destructive')}>{overdue.length}</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">On autopay</p><p className="mt-1 text-xl font-bold tnum">{bills.filter((b) => b.autopay).length} of {bills.length}</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">Expected income</p><Money value={round2(bills.filter((b) => b.isIncome).reduce((s, b) => s + b.amount, 0))} className="mt-1 block text-xl font-bold text-success" decimals={0} /></CardContent></Card>
      </div>

      {overdue.length > 0 && (
        <Card className="mt-4 border-destructive/40 bg-destructive/5 shadow-card">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <StatusBadge status="overdue" />
            <p className="text-sm font-medium">{overdue.length} bill{overdue.length > 1 ? 's are' : ' is'} overdue: {overdue.map((b) => b.name).join(', ')}</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="recurring">Recurring</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
        </Tabs>
        {view === 'calendar' && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setMonthOffset(monthOffset - 1)} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="min-w-32 text-center text-sm font-semibold">{format(calMonth, 'MMMM yyyy')}</span>
            <Button variant="outline" size="icon" onClick={() => setMonthOffset(monthOffset + 1)} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      {/* Upcoming list */}
      {view === 'upcoming' && (
        <Card className="mt-4 shadow-card">
          <CardContent className="p-0">
            {upcoming.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No upcoming bills" description="Add recurring bills to see what's due next." actionLabel="Add bill" onAction={() => setDialogOpen(true)} />
              </div>
            ) : (
              <ul className="divide-y">
                {upcoming.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center gap-3 p-4">
                    <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', b.isIncome ? 'bg-success-muted text-success' : 'bg-muted text-muted-foreground')}>
                      {b.isIncome ? <ArrowDownLeft className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                    </span>
                    <div className="min-w-40 flex-1">
                      <p className="text-sm font-semibold">{b.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(b.nextDueDate, 'EEEE, MMM d')} · {accounts.find((a) => a.id === b.accountId)?.name ?? 'Any account'}
                        {b.autopay && ' · Autopay'} · {frequencies.find((f) => f.value === b.frequency)?.label}
                      </p>
                    </div>
                    <Money value={b.isIncome ? b.amount : -b.amount} sign className={cn('text-base font-bold', b.isIncome && 'text-success')} decimals={0} />
                    {statusOf(b) === 'upcoming'
                      ? <StatusBadge status="no_activity" label="Scheduled" />
                      : <StatusBadge status={statusOf(b) as 'paid' | 'overdue' | 'due'} />}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`${b.name} actions`}><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => markPaid(b, false)}>Mark paid</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => markPaid(b, true)}>Mark paid & create transaction</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { skipBill(b.id, b.nextDueDate); toast.success('Occurrence skipped.') }}>Skip this occurrence</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditing(b); setDialogOpen(true) }}><Pencil className="mr-2 h-4 w-4" />Edit series</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => { deleteBill(b.id); toast.success('Bill deleted.') }}>
                          <Trash2 className="mr-2 h-4 w-4" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calendar view */}
      {view === 'calendar' && (
        <Card className="mt-4 shadow-card">
          <CardContent className="p-2 sm:p-4">
            <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-muted-foreground">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-border">
              {calendarDays.map((d, idx) => {
                const dayBills = d ? billsOnDay(d) : []
                const isToday = d && isSameDay(d, now)
                return (
                  <div key={idx} className={cn('min-h-20 bg-card p-1.5 sm:min-h-24', !d && 'bg-muted/30')}>
                    {d && (
                      <>
                        <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs tnum', isToday && 'bg-primary font-bold text-primary-foreground')}>
                          {d.getDate()}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {dayBills.slice(0, 3).map((b) => (
                            <div key={b.id} className={cn('truncate rounded px-1 py-0.5 text-[10px] font-medium tnum',
                              b.isIncome ? 'bg-success-muted text-success' : b.status === 'overdue' ? 'bg-destructive/10 text-destructive' : 'bg-accent text-accent-foreground')}>
                              {b.name} {formatCurrency(b.amount, { decimals: 0 })}
                            </div>
                          ))}
                          {dayBills.length > 3 && <p className="px-1 text-[10px] text-muted-foreground">+{dayBills.length - 3} more</p>}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recurring view */}
      {view === 'recurring' && (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {bills.map((b) => (
            <Card key={b.id} className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', b.isIncome ? 'bg-success-muted text-success' : 'bg-muted text-muted-foreground')}>
                      <Repeat className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{frequencies.find((f) => f.value === b.frequency)?.label} · day {b.dueDay}</p>
                    </div>
                  </div>
                  <Money value={b.amount} className="font-bold" decimals={0} />
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  {b.autopay && <span className="rounded bg-muted px-2 py-0.5">Autopay</span>}
                  {b.isIncome && <span className="rounded bg-success-muted px-2 py-0.5 text-success">Income</span>}
                  <span className="rounded bg-muted px-2 py-0.5">Remind {b.reminderDays}d before</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* History view */}
      {view === 'history' && (
        <Card className="mt-4 shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" />Payment history</CardTitle></CardHeader>
          <CardContent>
            {paidHistory.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing marked as paid yet. Payments you mark will appear here.</p>
            ) : (
              <ul className="divide-y">
                {paidHistory.map(({ bill, date }, i) => (
                  <li key={`${bill.id}-${i}`} className="flex items-center gap-3 py-2.5">
                    <StatusBadge status="paid" />
                    <span className="flex-1 text-sm font-medium">{bill.name}</span>
                    <span className="text-xs text-muted-foreground tnum">{formatDate(date, 'MMM d, yyyy')}</span>
                    <Money value={bill.amount} className="text-sm font-semibold" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <BillDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  )
}

export default function BillsPage() {
  return (
    <Suspense fallback={null}>
      <BillsInner />
    </Suspense>
  )
}
