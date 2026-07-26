'use client'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Car, Gem, GraduationCap, Home, MoreHorizontal, Palmtree, Pause,
  Pencil, PiggyBank, Plane, Play, Plus, ShieldCheck, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/stores/useStore'
import { PageHeader, StatusBadge } from '@/components/shared/Misc'
import { EmptyState } from '@/components/shared/States'
import { Money } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { goalMath } from '@/lib/finance/budget'
import { formatCurrency, formatDate, round2 } from '@/lib/format'
import type { Goal, GoalType } from '@/types'

export const goalIcons: Record<GoalType, typeof ShieldCheck> = {
  emergency: ShieldCheck, vacation: Palmtree, vehicle: Car, home: Home,
  education: GraduationCap, wedding: Gem, purchase: Plane, custom: PiggyBank,
}

export function GoalDialog({ open, onOpenChange, editing }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing?: Goal | null
}) {
  const { accounts, addGoal, updateGoal } = useStore()
  const [form, setForm] = useState({
    name: '', type: 'emergency' as GoalType, targetAmount: '', currentAmount: '',
    targetDate: '', monthlyContribution: '', accountId: '', priority: 'medium' as Goal['priority'], notes: '',
  })

  useEffect(() => {
    if (open) {
      setForm({
        name: editing?.name ?? '', type: editing?.type ?? 'emergency',
        targetAmount: editing ? String(editing.targetAmount) : '',
        currentAmount: editing ? String(editing.currentAmount) : '0',
        targetDate: editing?.targetDate ?? '',
        monthlyContribution: editing ? String(editing.monthlyContribution) : '',
        accountId: editing?.accountId ?? '', priority: editing?.priority ?? 'medium', notes: editing?.notes ?? '',
      })
    }
  }, [open, editing])

  const valid = form.name.trim().length > 1 && Number(form.targetAmount) > 0 && !!form.targetDate

  const save = () => {
    const payload = {
      name: form.name.trim(), type: form.type,
      targetAmount: round2(Number(form.targetAmount)),
      currentAmount: round2(Number(form.currentAmount) || 0),
      targetDate: form.targetDate,
      monthlyContribution: round2(Number(form.monthlyContribution) || 0),
      accountId: form.accountId || undefined,
      priority: form.priority,
      status: editing?.status ?? 'on_track' as Goal['status'],
      notes: form.notes || undefined,
    }
    if (editing) {
      updateGoal(editing.id, payload)
      toast.success('Goal updated.')
    } else {
      addGoal(payload)
      toast.success('Goal created.')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? 'Edit goal' : 'Add savings goal'}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="goal-name">Goal name</Label>
            <Input id="goal-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Emergency Fund" />
          </div>
          <div className="space-y-1.5">
            <Label>Goal type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as GoalType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="emergency">Emergency fund</SelectItem>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="vehicle">Vehicle down payment</SelectItem>
                <SelectItem value="home">Home down payment</SelectItem>
                <SelectItem value="education">Education</SelectItem>
                <SelectItem value="wedding">Wedding</SelectItem>
                <SelectItem value="purchase">Major purchase</SelectItem>
                <SelectItem value="custom">Custom goal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-target">Target amount ($)</Label>
            <Input id="goal-target" type="number" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-current">Current amount ($)</Label>
            <Input id="goal-current" type="number" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-date">Target date</Label>
            <Input id="goal-date" type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-monthly">Planned monthly contribution ($)</Label>
            <Input id="goal-monthly" type="number" value={form.monthlyContribution} onChange={(e) => setForm({ ...form, monthlyContribution: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Linked account</Label>
            <Select value={form.accountId || 'none'} onValueChange={(v) => setForm({ ...form, accountId: v === 'none' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {accounts.filter((a) => !a.archived && a.balance >= 0).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Goal['priority'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="goal-notes">Notes</Label>
            <Textarea id="goal-notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <Button className="mt-4 w-full" disabled={!valid} onClick={save}>{editing ? 'Save changes' : 'Create goal'}</Button>
      </DialogContent>
    </Dialog>
  )
}

function GoalsInner() {
  const { goals, accounts, updateGoal, deleteGoal } = useStore()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setEditing(null)
      setDialogOpen(true)
      const next = new URLSearchParams(searchParams.toString())
      next.delete('add')
      router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname)
    }
  }, [searchParams, pathname, router])

  return (
    <div>
      <PageHeader
        title="Savings goals"
        description="Milestones, monthly contributions, and the finish line."
        actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="mr-1.5 h-4 w-4" />Add goal</Button>}
      />

      {goals.length === 0 ? (
        <EmptyState
          icon={<PiggyBank className="h-6 w-6" />}
          title="No savings goals yet"
          description="Create an emergency fund, vacation fund, or down-payment goal and track every contribution."
          actionLabel="Add goal"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((g, idx) => {
            const gm = goalMath(g)
            const Icon = goalIcons[g.type]
            const account = accounts.find((a) => a.id === g.accountId)
            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Card className="h-full shadow-card">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <Link href={`/app/goals/${g.id}`} className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold hover:underline">{g.name}</span>
                          <span className="text-xs text-muted-foreground">{account ? `Linked: ${account.name}` : 'No linked account'}</span>
                        </span>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`${g.name} actions`}><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild><Link href={`/app/goals/${g.id}`}>Open details</Link></DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditing(g); setDialogOpen(true) }}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            updateGoal(g.id, { status: g.status === 'paused' ? 'on_track' : 'paused' })
                            toast.success(g.status === 'paused' ? 'Goal resumed.' : 'Goal paused.')
                          }}>
                            {g.status === 'paused' ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                            {g.status === 'paused' ? 'Resume' : 'Pause'}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => { deleteGoal(g.id); toast.success('Goal deleted.') }}>
                            <Trash2 className="mr-2 h-4 w-4" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-baseline justify-between">
                        <Money value={g.currentAmount} className="text-2xl font-bold" decimals={0} />
                        <span className="text-sm text-muted-foreground tnum">of {formatCurrency(g.targetAmount, { decimals: 0 })}</span>
                      </div>
                      <div className="relative mt-2">
                        <Progress value={gm.pct} className="h-2.5" />
                        {[25, 50, 75].map((m) => (
                          <span key={m} className="absolute top-0 h-2.5 w-px bg-background" style={{ left: `${m}%` }} />
                        ))}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-semibold tnum">{gm.pct.toFixed(0)}%</span>
                        <StatusBadge status={g.status === 'completed' ? 'completed' : g.status === 'paused' ? 'paused' : gm.onTrack ? 'on_track' : 'behind'} />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                      <div><p className="text-muted-foreground">Target date</p><p className="font-medium tnum">{formatDate(g.targetDate, 'MMM yyyy')}</p></div>
                      <div><p className="text-muted-foreground">Monthly contribution</p><p className="font-medium tnum">{formatCurrency(g.monthlyContribution, { decimals: 0 })}</p></div>
                      <div><p className="text-muted-foreground">Needed monthly</p><p className="font-medium tnum">{formatCurrency(gm.requiredMonthly, { decimals: 0 })}</p></div>
                      <div><p className="text-muted-foreground">Est. completion</p><p className="font-medium tnum">{gm.estimatedCompletion ? formatDate(gm.estimatedCompletion, 'MMM yyyy') : '—'}</p></div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <GoalDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  )
}

export default function GoalsPage() {
  return (
    <Suspense fallback={null}>
      <GoalsInner />
    </Suspense>
  )
}
