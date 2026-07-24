import { useMemo, useState } from 'react'
import { addMonths, format, parseISO } from 'date-fns'
import { Area, AreaChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import {
  ArrowRightLeft, ChevronLeft, ChevronRight, Copy, MoreHorizontal, Plus,
  RotateCcw, Settings2, Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/stores/useStore'
import { PageHeader, StatusBadge } from '@/components/shared/Misc'
import { EmptyState } from '@/components/shared/States'
import { Money } from '@/components/shared/Money'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { budgetStatus, budgetTotals, spendingByCategory } from '@/lib/finance/budget'
import { monthlySummaries } from '@/lib/finance/derive'
import { formatCurrency, formatMonth, round2 } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function Budgets() {
  const {
    transactions, categories, budgets, upsertBudget, updateBudgetEntry,
    addBudgetEntry, removeBudgetEntry, copyBudget,
  } = useStore()
  const [monthOffset, setMonthOffset] = useState(0)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [drawerCategory, setDrawerCategory] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addCategoryId, setAddCategoryId] = useState('')
  const [addAmount, setAddAmount] = useState('')
  const [moveOpen, setMoveOpen] = useState<string | null>(null)
  const [moveTarget, setMoveTarget] = useState('')
  const [moveAmount, setMoveAmount] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([])

  const monthDate = addMonths(new Date(), monthOffset)
  const month = format(monthDate, 'yyyy-MM')
  const prevMonth = format(addMonths(monthDate, -1), 'yyyy-MM')

  const budget = budgets.find((b) => b.month === month)
  const spent = useMemo(() => spendingByCategory(transactions, month), [transactions, month])
  const prevSpent = useMemo(() => spendingByCategory(transactions, prevMonth), [transactions, prevMonth])
  const summaries = useMemo(() => monthlySummaries(transactions, 6), [transactions])
  const bt = budget ? budgetTotals(budget, spent) : null

  const grouped = useMemo(() => {
    if (!budget) return []
    const groups: { group: string; entries: typeof budget.entries }[] = []
    for (const e of budget.entries) {
      const cat = categories.find((c) => c.id === e.categoryId)
      const g = cat?.group ?? 'Other'
      const existing = groups.find((x) => x.group === g)
      if (existing) existing.entries.push(e)
      else groups.push({ group: g, entries: [e] })
    }
    return groups
  }, [budget, categories])

  const ensureBudget = () => {
    if (!budget) {
      copyBudget(prevMonth, month)
      toast.success(`Copied ${format(parseISO(`${prevMonth}-01`), 'MMMM')} budget forward.`)
    }
  }

  const commitEdit = (categoryId: string) => {
    const v = Number(editValue)
    if (Number.isFinite(v) && v >= 0) {
      ensureBudget()
      updateBudgetEntry(month, categoryId, round2(v))
    }
    setEditingCell(null)
  }

  const unusedCategories = categories.filter((c) => !c.archived && c.group !== 'Income' && !budget?.entries.some((e) => e.categoryId === c.id))

  const drawerCat = drawerCategory ? categories.find((c) => c.id === drawerCategory) : null
  const drawerEntry = budget?.entries.find((e) => e.categoryId === drawerCategory)
  const drawerTx = useMemo(
    () => transactions.filter((t) => t.type === 'expense' && t.date.startsWith(month) && (t.categoryId === drawerCategory || t.splits?.some((s) => s.categoryId === drawerCategory))).slice(0, 8),
    [transactions, month, drawerCategory])
  const drawerTrend = useMemo(() => {
    if (!drawerCategory) return []
    return summaries.map((s) => ({
      label: s.label,
      value: spendingByCategory(transactions, s.month).get(drawerCategory) ?? 0,
    }))
  }, [drawerCategory, summaries, transactions])
  const drawerAvg = drawerTrend.length ? round2(drawerTrend.reduce((s, t) => s + t.value, 0) / drawerTrend.length) : 0

  return (
    <div>
      <PageHeader
        title={`${formatMonth(monthDate)} Budget`}
        description="Give every dollar a job, then track how the month unfolds."
        actions={
          <>
            <Button variant="outline" onClick={() => { copyBudget(prevMonth, month); toast.success('Copied last month’s budget.') }}>
              <Copy className="mr-1.5 h-4 w-4" />Copy last month
            </Button>
            <Button variant="outline" onClick={() => {
              if (budget) { upsertBudget(month, { entries: [] }); toast.success('Budget reset — categories cleared.') }
            }}>
              <RotateCcw className="mr-1.5 h-4 w-4" />Reset
            </Button>
            <Button onClick={() => setAddOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Add category</Button>
          </>
        }
      />

      {/* Month nav */}
      <div className="mb-5 flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setMonthOffset(monthOffset - 1)} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
        <span className="min-w-36 text-center text-sm font-semibold">{formatMonth(monthDate)}</span>
        <Button variant="outline" size="icon" onClick={() => setMonthOffset(monthOffset + 1)} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
        {monthOffset !== 0 && <Button variant="ghost" size="sm" onClick={() => setMonthOffset(0)}>Current month</Button>}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Expected income', value: budget?.expectedIncome ?? 0 },
          { label: 'Total budgeted', value: bt?.totalBudgeted ?? 0 },
          { label: 'Actual spending', value: bt?.totalSpent ?? 0 },
          { label: 'Remaining', value: bt?.remaining ?? 0, warn: (bt?.remaining ?? 0) < 0 },
          { label: 'Savings target', value: budget?.savingsTarget ?? 0 },
          { label: 'Left to assign', value: bt?.leftToAssign ?? 0, warn: (bt?.leftToAssign ?? 0) < 0 },
        ].map((s) => (
          <Card key={s.label} className="shadow-card">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <Money value={s.value} className={cn('mt-1 block text-lg font-bold', s.warn && 'text-destructive')} decimals={0} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Income / savings editors */}
      <Card className="mt-4 shadow-card">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <label className="flex items-center gap-2 text-sm">
            Expected income
            <Input
              type="number" className="h-8 w-28" value={budget?.expectedIncome ?? ''} placeholder="6250"
              onChange={(e) => upsertBudget(month, { expectedIncome: Number(e.target.value) || 0 })}
              aria-label="Expected income"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            Savings target
            <Input
              type="number" className="h-8 w-28" value={budget?.savingsTarget ?? ''} placeholder="800"
              onChange={(e) => upsertBudget(month, { savingsTarget: Number(e.target.value) || 0 })}
              aria-label="Savings target"
            />
          </label>
          {bt && (
            <span className="ml-auto text-sm text-muted-foreground">
              <span className={cn('font-semibold tnum', bt.pctUsed > 100 ? 'text-destructive' : 'text-foreground')}>{Math.round(bt.pctUsed)}%</span> of budget used
            </span>
          )}
        </CardContent>
      </Card>

      {/* Categories */}
      {!budget || budget.entries.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<Wallet className="h-6 w-6" />}
            title="Create your first monthly budget to see where your money is going"
            description="Start from last month’s categories or add them one by one."
            actionLabel="Copy last month’s budget"
            onAction={() => { copyBudget(prevMonth, month); toast.success('Budget created from last month.') }}
          />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {grouped.map(({ group, entries }) => {
            const collapsed = collapsedGroups.includes(group)
            const groupBudgeted = round2(entries.reduce((s, e) => s + e.budgeted, 0))
            const groupSpent = round2(entries.reduce((s, e) => s + (spent.get(e.categoryId) ?? 0), 0))
            return (
              <Card key={group} className="shadow-card">
                <button
                  className="flex w-full items-center gap-3 border-b p-4 text-left"
                  onClick={() => setCollapsedGroups(collapsed ? collapsedGroups.filter((g) => g !== group) : [...collapsedGroups, group])}
                  aria-expanded={!collapsed}
                >
                  <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', !collapsed && 'rotate-90')} />
                  <span className="text-sm font-semibold">{group}</span>
                  <span className="ml-auto text-xs text-muted-foreground tnum">
                    {formatCurrency(groupSpent, { decimals: 0 })} of {formatCurrency(groupBudgeted, { decimals: 0 })}
                  </span>
                </button>
                {!collapsed && (
                  <div className="divide-y">
                    {entries.map((e) => {
                      const cat = categories.find((c) => c.id === e.categoryId)
                      const s = spent.get(e.categoryId) ?? 0
                      const status = budgetStatus(e.budgeted, s)
                      const remaining = round2(e.budgeted - s)
                      const pctUsed = e.budgeted > 0 ? Math.min(100, (s / e.budgeted) * 100) : s > 0 ? 100 : 0
                      return (
                        <div key={e.categoryId} className="flex items-center gap-3 p-4">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <CategoryIcon icon={cat?.icon ?? 'shopping-bag'} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <button className="truncate text-sm font-medium hover:underline" onClick={() => setDrawerCategory(e.categoryId)}>
                                {cat?.name ?? e.categoryId}
                              </button>
                              <StatusBadge status={status} />
                            </div>
                            <div className="mt-1.5 flex items-center gap-3">
                              <Progress value={pctUsed} className={cn('h-1.5 max-w-52', status === 'over_budget' && '[&>div]:bg-destructive', status === 'near_limit' && '[&>div]:bg-warning')} />
                              <span className="text-xs text-muted-foreground tnum">
                                <span className="font-medium text-foreground">{formatCurrency(s, { decimals: 0 })}</span> spent ·{' '}
                                <span className={cn(remaining < 0 && 'font-medium text-destructive')}>{formatCurrency(Math.abs(remaining), { decimals: 0 })} {remaining < 0 ? 'over' : 'left'}</span>
                              </span>
                            </div>
                          </div>
                          <div className="hidden w-28 text-right sm:block">
                            {editingCell === e.categoryId ? (
                              <Input
                                autoFocus type="number" className="h-8 text-right" value={editValue}
                                onChange={(ev) => setEditValue(ev.target.value)}
                                onBlur={() => commitEdit(e.categoryId)}
                                onKeyDown={(ev) => ev.key === 'Enter' && commitEdit(e.categoryId)}
                                aria-label="Edit budgeted amount"
                              />
                            ) : (
                              <button
                                className="text-sm font-semibold tnum hover:text-primary"
                                onClick={() => { setEditingCell(e.categoryId); setEditValue(String(e.budgeted)) }}
                                aria-label={`Edit budget for ${cat?.name}`}
                              >
                                {formatCurrency(e.budgeted, { decimals: 0 })}
                              </button>
                            )}
                            <p className="text-[11px] text-muted-foreground">budgeted</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Category actions"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDrawerCategory(e.categoryId)}>View details</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditingCell(e.categoryId); setEditValue(String(e.budgeted)) }}>Edit amount</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setMoveOpen(e.categoryId); setMoveTarget(''); setMoveAmount('') }}>
                                <ArrowRightLeft className="mr-2 h-4 w-4" />Move money
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  updateBudgetEntry(month, e.categoryId, e.budgeted)
                                  upsertBudget(month, { entries: budget.entries.map((x) => x.categoryId === e.categoryId ? { ...x, rollover: !x.rollover } : x) })
                                  toast.success(`Rollover ${e.rollover ? 'disabled' : 'enabled'} for ${cat?.name}.`)
                                }}>
                                {e.rollover ? 'Disable' : 'Enable'} rollover
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => { removeBudgetEntry(month, e.categoryId); toast.success('Category removed from budget.') }}>
                                Remove from budget
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Add category dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add budget category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={addCategoryId} onValueChange={setAddCategoryId}>
              <SelectTrigger aria-label="Category"><SelectValue placeholder="Choose a category" /></SelectTrigger>
              <SelectContent>
                {unusedCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.group} · {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Budgeted amount" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} aria-label="Budgeted amount" />
            <Button
              className="w-full"
              disabled={!addCategoryId || !Number(addAmount)}
              onClick={() => {
                ensureBudget()
                addBudgetEntry(month, addCategoryId, round2(Number(addAmount)))
                toast.success('Category added to budget.')
                setAddOpen(false); setAddCategoryId(''); setAddAmount('')
              }}
            >
              Add to budget
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move money dialog */}
      <Dialog open={!!moveOpen} onOpenChange={() => setMoveOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Move money between categories</DialogTitle></DialogHeader>
          {moveOpen && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                From <span className="font-medium text-foreground">{categories.find((c) => c.id === moveOpen)?.name}</span>
              </p>
              <Select value={moveTarget} onValueChange={setMoveTarget}>
                <SelectTrigger aria-label="Target category"><SelectValue placeholder="To category" /></SelectTrigger>
                <SelectContent>
                  {budget?.entries.filter((e) => e.categoryId !== moveOpen).map((e) => (
                    <SelectItem key={e.categoryId} value={e.categoryId}>{categories.find((c) => c.id === e.categoryId)?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Amount to move" value={moveAmount} onChange={(e) => setMoveAmount(e.target.value)} aria-label="Amount to move" />
              <Button
                className="w-full"
                disabled={!moveTarget || !(Number(moveAmount) > 0)}
                onClick={() => {
                  const amt = round2(Number(moveAmount))
                  const from = budget?.entries.find((e) => e.categoryId === moveOpen)
                  const to = budget?.entries.find((e) => e.categoryId === moveTarget)
                  if (from && to) {
                    updateBudgetEntry(month, moveOpen, round2(Math.max(0, from.budgeted - amt)))
                    updateBudgetEntry(month, moveTarget, round2(to.budgeted + amt))
                    toast.success(`Moved ${formatCurrency(amt, { decimals: 0 })} between categories.`)
                  }
                  setMoveOpen(null)
                }}
              >
                Move money
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail drawer */}
      <Sheet open={!!drawerCategory} onOpenChange={() => setDrawerCategory(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {drawerCat && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <CategoryIcon icon={drawerCat.icon} />{drawerCat.name}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-[11px] text-muted-foreground">Budgeted</p>
                    <Money value={drawerEntry?.budgeted ?? 0} className="font-bold" decimals={0} />
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-[11px] text-muted-foreground">Spent</p>
                    <Money value={spent.get(drawerCat.id) ?? 0} className="font-bold" decimals={0} />
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-[11px] text-muted-foreground">6-mo avg</p>
                    <Money value={drawerAvg} className="font-bold" decimals={0} />
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Spending trend</h3>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={drawerTrend}>
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis hide />
                        <RTooltip formatter={(v: number) => formatCurrency(v, { decimals: 0 })} />
                        <Area type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1)/0.15)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last month: {formatCurrency(prevSpent.get(drawerCat.id) ?? 0, { decimals: 0 })} · Suggested budget: {formatCurrency(Math.max(drawerAvg, prevSpent.get(drawerCat.id) ?? 0), { decimals: 0 })}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Budget amount</h3>
                  <div className="flex gap-2">
                    <Input
                      type="number" defaultValue={drawerEntry?.budgeted ?? 0} id="drawer-budget"
                      aria-label="Budget amount"
                    />
                    <Button onClick={() => {
                      const el = document.getElementById('drawer-budget') as HTMLInputElement
                      ensureBudget()
                      updateBudgetEntry(month, drawerCat.id, round2(Number(el.value) || 0))
                      toast.success('Budget updated.')
                    }}>Save</Button>
                  </div>
                  <label className="flex items-center justify-between text-sm">
                    Roll unspent amount into next month
                    <Switch
                      checked={drawerEntry?.rollover ?? false}
                      onCheckedChange={(v) => upsertBudget(month, { entries: (budget?.entries ?? []).map((x) => x.categoryId === drawerCat.id ? { ...x, rollover: v } : x) })}
                      aria-label="Rollover setting"
                    />
                  </label>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Recent transactions</h3>
                  {drawerTx.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No transactions in this category this month.</p>
                  ) : (
                    <ul className="space-y-2">
                      {drawerTx.map((t) => (
                        <li key={t.id} className="flex items-center justify-between text-sm">
                          <span className="min-w-0 flex-1 truncate">{t.merchant}</span>
                          <Money value={t.amount} className="font-medium" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
