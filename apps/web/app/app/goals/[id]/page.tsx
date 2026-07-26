'use client'
import { useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { addMonths, format, parseISO } from 'date-fns'
import { ArrowLeft, Pause, Pencil, Play, Plus, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/stores/useStore'
import { GoalDialog, goalIcons } from '@/components/financial/GoalDialog'
import { ChartCard, PageHeader, StatusBadge } from '@/components/shared/Misc'
import { ErrorState } from '@/components/shared/States'
import { Money } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { goalMath } from '@/lib/finance/budget'
import { formatCurrency, formatDate, round2 } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function GoalDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { goals, accounts, updateGoal, addContribution, pushNotification } = useStore()
  const goal = goals.find((g) => g.id === id)
  const [editOpen, setEditOpen] = useState(false)
  const [contribOpen, setContribOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const gm = useMemo(() => (goal ? goalMath(goal) : null), [goal])

  const projection = useMemo(() => {
    if (!goal) return []
    const points: { month: string; actual?: number; projected?: number }[] = []
    const history = [...goal.contributions].sort((a, b) => a.date.localeCompare(b.date))
    let running = round2(goal.currentAmount - history.reduce((s, c) => s + c.amount, 0))
    const start = history.length ? parseISO(history[0].date) : new Date()
    points.push({ month: format(start, 'MMM yy'), actual: Math.max(0, running) })
    for (const c of history) {
      running = round2(running + c.amount)
      points.push({ month: format(parseISO(c.date), 'MMM yy'), actual: running })
    }
    // Projection from now
    const now = new Date()
    let proj = goal.currentAmount
    points.push({ month: format(now, 'MMM yy'), actual: goal.currentAmount, projected: goal.currentAmount })
    for (let m = 1; m <= 12 && proj < goal.targetAmount * 1.01; m++) {
      proj = round2(proj + goal.monthlyContribution)
      points.push({ month: format(addMonths(now, m), 'MMM yy'), projected: Math.min(proj, goal.targetAmount) })
    }
    return points
  }, [goal])

  if (!goal || !gm) {
    return <ErrorState title="Goal not found" description="This goal may have been deleted." onRetry={() => router.push('/app/goals')} />
  }

  const Icon = goalIcons[goal.type]
  const nextMilestone = [25, 50, 75, 100].find((m) => gm.pct < m)

  const submitContribution = () => {
    const amt = round2(Number(amount))
    if (!(amt > 0)) return
    const before = goalMath(goal).pct
    addContribution(goal.id, amt, note || undefined)
    const afterPct = ((goal.currentAmount + amt) / goal.targetAmount) * 100
    const crossed = [25, 50, 75, 100].find((m) => before < m && afterPct >= m)
    if (crossed === 100) {
      updateGoal(goal.id, { status: 'completed' })
      pushNotification({ type: 'goal', title: `${goal.name} completed!`, message: `You reached 100% of your ${goal.name} goal — ${formatCurrency(goal.targetAmount)} saved.` })
      toast.success(`🎉 ${goal.name} fully funded! Amazing work.`, { duration: 6000 })
    } else if (crossed) {
      pushNotification({ type: 'goal', title: `${goal.name} reached ${crossed}%`, message: `Your ${goal.name} goal passed the ${crossed}% milestone.` })
      toast.success(`Milestone: ${goal.name} reached ${crossed}%.`)
    } else {
      toast.success('Contribution added.')
    }
    setContribOpen(false)
    setAmount('')
    setNote('')
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push('/app/goals')}>
        <ArrowLeft className="mr-1 h-4 w-4" />All goals
      </Button>
      <PageHeader
        title={goal.name}
        description={`${accounts.find((a) => a.id === goal.accountId)?.name ?? 'No linked account'} · ${goal.priority} priority`}
        actions={
          <>
            <Button variant="outline" onClick={() => {
              updateGoal(goal.id, { status: goal.status === 'paused' ? 'on_track' : 'paused' })
              toast.success(goal.status === 'paused' ? 'Goal resumed.' : 'Goal paused.')
            }}>
              {goal.status === 'paused' ? <Play className="mr-1.5 h-4 w-4" /> : <Pause className="mr-1.5 h-4 w-4" />}
              {goal.status === 'paused' ? 'Resume' : 'Pause'}
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="mr-1.5 h-4 w-4" />Edit goal</Button>
            <Button onClick={() => setContribOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Add contribution</Button>
          </>
        }
      />

      {/* Progress hero */}
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-8 w-8" />
            </div>
            <div className="min-w-52 flex-1">
              <div className="flex items-baseline justify-between">
                <Money value={goal.currentAmount} className="text-3xl font-extrabold" decimals={0} />
                <span className="text-sm text-muted-foreground tnum">of {formatCurrency(goal.targetAmount, { decimals: 0 })}</span>
              </div>
              <div className="relative mt-2">
                <Progress value={gm.pct} className="h-3" />
                {[25, 50, 75].map((m) => (
                  <span key={m} className={cn('absolute -top-0.5 h-4 w-0.5 rounded', gm.pct >= m ? 'bg-primary-foreground' : 'bg-muted-foreground/30')} style={{ left: `${m}%` }} />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-lg font-bold tnum">{gm.pct.toFixed(1)}%</span>
                <StatusBadge status={goal.status === 'completed' ? 'completed' : goal.status === 'paused' ? 'paused' : gm.onTrack ? 'on_track' : 'behind'} />
                {nextMilestone && <span className="text-xs text-muted-foreground">Next milestone at {nextMilestone}%</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
              <div><p className="text-[11px] text-muted-foreground">Remaining</p><Money value={gm.remaining} className="font-bold" decimals={0} /></div>
              <div><p className="text-[11px] text-muted-foreground">Needed monthly</p><Money value={gm.requiredMonthly} className="font-bold" decimals={0} /></div>
              <div><p className="text-[11px] text-muted-foreground">Est. completion</p><p className="font-bold tnum">{gm.estimatedCompletion ? formatDate(gm.estimatedCompletion, 'MMM yyyy') : '—'}</p></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <div className="mt-4 grid grid-cols-4 gap-3">
        {[25, 50, 75, 100].map((m) => {
          const reached = gm.pct >= m
          return (
            <motion.div key={m} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: m / 400 }}>
              <Card className={cn('shadow-card', reached && 'border-success/40 bg-success-muted/30')}>
                <CardContent className="flex flex-col items-center p-4 text-center">
                  <Trophy className={cn('h-5 w-5', reached ? 'text-success' : 'text-muted-foreground/30')} />
                  <p className={cn('mt-1.5 text-sm font-bold tnum', reached ? 'text-success' : 'text-muted-foreground')}>{m}%</p>
                  <p className="text-[10px] text-muted-foreground">{reached ? 'Reached' : 'Not yet'}</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <ChartCard title="Progress & projection" description="Actual balance plus projected path at current contribution" className="lg:col-span-3"
          summary={`Goal is ${gm.pct.toFixed(0)}% funded.`}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projection}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} width={42} />
                <RTooltip formatter={(v: number) => formatCurrency(v, { decimals: 0 })} />
                <Area type="monotone" dataKey="actual" name="Actual" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1)/0.15)" strokeWidth={2} connectNulls />
                <Area type="monotone" dataKey="projected" name="Projected" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3)/0.08)" strokeWidth={2} strokeDasharray="6 4" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Contribution history" description={`${goal.contributions.length} contributions`} className="lg:col-span-2">
          {goal.contributions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No contributions yet — add your first one.</p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {[...goal.contributions].sort((a, b) => b.date.localeCompare(a.date)).map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <span>
                    <span className="block font-medium tnum">{formatDate(c.date, 'MMM d, yyyy')}</span>
                    {c.note && <span className="text-xs text-muted-foreground">{c.note}</span>}
                  </span>
                  <Money value={c.amount} sign className="font-semibold text-success" />
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>

      {goal.notes && (
        <Card className="mt-4 shadow-card">
          <CardContent className="p-4 text-sm text-muted-foreground"><span className="font-medium text-foreground">Notes:</span> {goal.notes}</CardContent>
        </Card>
      )}

      <GoalDialog open={editOpen} onOpenChange={setEditOpen} editing={goal} />

      <Dialog open={contribOpen} onOpenChange={setContribOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add contribution — {goal.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="contrib-amt">Amount ($)</Label>
              <Input id="contrib-amt" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(goal.monthlyContribution)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contrib-note">Note (optional)</Label>
              <Input id="contrib-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Monthly transfer" />
            </div>
            <Button className="w-full" disabled={!(Number(amount) > 0)} onClick={submitContribution}>Add contribution</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
