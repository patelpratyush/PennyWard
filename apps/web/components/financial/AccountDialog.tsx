'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useCreateAccount, useUpdateAccount } from '@/hooks/queries/useAccounts'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { round2 } from '@/lib/format'
import type { Account, AccountType } from '@/types'

const typeLabels: Record<AccountType, string> = {
  checking: 'Checking', savings: 'Savings', cash: 'Cash', credit_card: 'Credit card',
  auto_loan: 'Auto loan', student_loan: 'Student loan', mortgage: 'Mortgage',
  personal_loan: 'Personal loan', investment: 'Investment', other: 'Other',
}

export function AccountDialog({ open, onOpenChange, editing }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing?: Account | null
}) {
  const createAccount = useCreateAccount()
  const updateAccountMut = useUpdateAccount()
  const [form, setForm] = useState({
    name: '', institution: '', type: 'checking' as AccountType, balance: '',
    creditLimit: '', apr: '', minimumPayment: '', includeInNetWorth: true,
  })

  useEffect(() => {
    if (open) {
      setForm({
        name: editing?.name ?? '',
        institution: editing?.institution ?? '',
        type: editing?.type ?? 'checking',
        balance: editing ? String(Math.abs(editing.balance)) : '',
        creditLimit: editing?.creditLimit ? String(editing.creditLimit) : '',
        apr: editing?.apr ? String(editing.apr) : '',
        minimumPayment: editing?.minimumPayment ? String(editing.minimumPayment) : '',
        includeInNetWorth: editing?.includeInNetWorth ?? true,
      })
    }
  }, [open, editing])

  const isLiability = ['credit_card', 'auto_loan', 'student_loan', 'mortgage', 'personal_loan'].includes(form.type)
  const valid = form.name.trim().length > 1 && form.balance !== ''

  const save = () => {
    const balance = round2(Math.abs(Number(form.balance)) * (isLiability ? -1 : 1))
    const payload = {
      name: form.name.trim(),
      institution: form.institution.trim() || form.name.trim(),
      type: form.type,
      balance,
      includeInNetWorth: form.includeInNetWorth,
      archived: editing?.archived ?? false,
      creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined,
      apr: form.apr ? Number(form.apr) : undefined,
      minimumPayment: form.minimumPayment ? Number(form.minimumPayment) : undefined,
    }
    if (editing) {
      updateAccountMut.mutate({ id: editing.id, patch: payload })
      toast.success('Account updated.')
    } else {
      createAccount.mutate(payload)
      toast.success('Account added.')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? 'Edit account' : 'Add account'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="acc-name">Account name</Label>
              <Input id="acc-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chase Checking" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-inst">Institution</Label>
              <Input id="acc-inst" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="e.g. Chase" />
            </div>
            <div className="space-y-1.5">
              <Label>Account type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as AccountType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-bal">{isLiability ? 'Amount owed' : 'Current balance'}</Label>
              <Input id="acc-bal" type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder="0.00" />
            </div>
            {form.type === 'credit_card' && (
              <div className="space-y-1.5">
                <Label htmlFor="acc-limit">Credit limit</Label>
                <Input id="acc-limit" type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
              </div>
            )}
            {isLiability && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-apr">APR (%)</Label>
                  <Input id="acc-apr" type="number" step="0.01" value={form.apr} onChange={(e) => setForm({ ...form, apr: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-min">Minimum payment</Label>
                  <Input id="acc-min" type="number" value={form.minimumPayment} onChange={(e) => setForm({ ...form, minimumPayment: e.target.value })} />
                </div>
              </>
            )}
          </div>
          <label className="flex items-center justify-between text-sm">
            Include in net worth
            <Switch checked={form.includeInNetWorth} onCheckedChange={(v) => setForm({ ...form, includeInNetWorth: v })} aria-label="Include in net worth" />
          </label>
          <Button className="w-full" disabled={!valid} onClick={save}>{editing ? 'Save changes' : 'Add account'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
