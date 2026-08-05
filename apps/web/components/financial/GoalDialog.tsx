'use client'
import { useEffect, useState } from 'react'
import {
  Car, Gem, GraduationCap, Home, Palmtree, PiggyBank, Plane, ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { useCreateGoal, useUpdateGoal } from '@/hooks/queries/useGoals'
import { useAccounts } from '@/hooks/queries/useAccounts'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { round2 } from '@/lib/format'
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
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const { data: accounts = [] } = useAccounts()
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
      accountId: form.accountId || null,
      priority: form.priority,
      status: editing?.status ?? 'on_track' as Goal['status'],
      notes: form.notes || undefined,
    }
    const onSuccess = () => {
      toast.success(editing ? 'Goal updated.' : 'Goal created.')
      onOpenChange(false)
    }
    const onError = () => toast.error(editing ? 'Could not update goal.' : 'Could not create goal.')
    if (editing) {
      updateGoal.mutate({ id: editing.id, patch: payload }, { onSuccess, onError })
    } else {
      createGoal.mutate(payload, { onSuccess, onError })
    }
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
