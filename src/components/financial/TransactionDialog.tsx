import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '@/stores/useStore'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, round2 } from '@/lib/format'
import type { Transaction } from '@/types'

const schema = z.object({
  type: z.enum(['expense', 'income', 'transfer']),
  amount: z.number('Enter an amount greater than $0.').positive('Enter an amount greater than $0.'),
  merchant: z.string().min(1, 'Enter a merchant or payee.'),
  description: z.string().optional(),
  date: z.string().min(1, 'Choose a transaction date.'),
  postedDate: z.string().optional(),
  accountId: z.string().min(1, 'Choose an account.'),
  categoryId: z.string().optional(),
  tags: z.string().optional(),
  notes: z.string().optional(),
  recurring: z.boolean(),
  cleared: z.boolean(),
  transferAccountId: z.string().optional(),
})
type Values = z.infer<typeof schema>

interface SplitRow { categoryId: string; amount: number }

export function TransactionDialog({ open, onOpenChange, editing }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing?: Transaction | null
}) {
  const { accounts, categories, addTransaction, updateTransaction } = useStore()
  const [splits, setSplits] = useState<SplitRow[]>([])
  const [splitMode, setSplitMode] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'expense', amount: undefined, merchant: '', description: '',
      date: new Date().toISOString().slice(0, 10), postedDate: '', accountId: '',
      categoryId: '', tags: '', notes: '', recurring: false, cleared: true, transferAccountId: '',
    },
  })

  useEffect(() => {
    if (open) {
      setSplitMode(!!editing?.splits?.length)
      setSplits(editing?.splits?.map((s) => ({ categoryId: s.categoryId, amount: s.amount })) ?? [])
      reset({
        type: editing?.type ?? 'expense',
        amount: editing?.amount ?? undefined,
        merchant: editing?.merchant ?? '',
        description: editing?.description ?? '',
        date: editing?.date ?? new Date().toISOString().slice(0, 10),
        postedDate: editing?.postedDate ?? '',
        accountId: editing?.accountId ?? accounts.find((a) => !a.archived)?.id ?? '',
        categoryId: editing?.categoryId ?? '',
        tags: editing?.tags?.join(', ') ?? '',
        notes: editing?.notes ?? '',
        recurring: editing?.recurring ?? false,
        cleared: editing?.cleared ?? true,
        transferAccountId: editing?.transferAccountId ?? '',
      })
    }
  }, [open, editing, reset, accounts])

  const type = watch('type')
  const amount = watch('amount') || 0
  const activeCategories = categories.filter((c) => !c.archived && (type === 'income' ? c.group === 'Income' : c.group !== 'Income'))
  const splitTotal = round2(splits.reduce((s, r) => s + (r.amount || 0), 0))
  const splitRemaining = round2(amount - splitTotal)
  const splitError = useMemo(() => {
    if (!splitMode || splits.length === 0) return ''
    if (splits.some((r) => !r.categoryId)) return 'Choose a category for every split row.'
    if (splits.some((r) => !(r.amount > 0))) return 'Every split needs an amount greater than $0.'
    if (Math.abs(splitRemaining) > 0.005) return `${formatCurrency(Math.abs(splitRemaining))} ${splitRemaining > 0 ? 'unallocated' : 'over-allocated'}.`
    return ''
  }, [splitMode, splits, splitRemaining])

  const onSubmit = async (v: Values) => {
    if (splitMode && splitError) return
    await new Promise((r) => setTimeout(r, 300))
    const payload = {
      type: v.type,
      amount: round2(v.amount),
      merchant: v.merchant,
      description: v.description || undefined,
      date: v.date,
      postedDate: v.postedDate || undefined,
      accountId: v.accountId,
      categoryId: splitMode ? undefined : v.categoryId || undefined,
      tags: v.tags ? v.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      notes: v.notes || undefined,
      recurring: v.recurring,
      cleared: v.cleared,
      importSource: 'manual' as const,
      transferAccountId: v.type === 'transfer' ? v.transferAccountId : undefined,
      splits: splitMode && splits.length
        ? splits.map((s) => ({ id: crypto.randomUUID?.() ?? String(Math.random()), categoryId: s.categoryId, amount: round2(s.amount) }))
        : undefined,
    }
    if (editing) {
      updateTransaction(editing.id, payload)
      toast.success('Transaction updated.')
    } else {
      addTransaction(payload)
      toast.success(v.type === 'transfer' ? 'Transfer recorded — not counted as income or spending.' : 'Transaction added.')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit transaction' : 'Add transaction'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Type segmented control */}
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Transaction type">
            {(['expense', 'income', 'transfer'] as const).map((t) => (
              <button
                key={t} type="button" role="radio" aria-checked={type === t}
                onClick={() => setValue('type', t)}
                className={`h-9 rounded-md text-sm font-medium capitalize transition-colors ${type === t ? 'bg-background shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input id="tx-amount" type="number" step="0.01" min="0" className="pl-7" {...register('amount')} aria-invalid={!!errors.amount} />
              </div>
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-merchant">{type === 'transfer' ? 'Description' : 'Merchant / payee'}</Label>
              <Input id="tx-merchant" {...register('merchant')} placeholder="e.g. Whole Foods Market" aria-invalid={!!errors.merchant} />
              {errors.merchant && <p className="text-xs text-destructive">{errors.merchant.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Transaction date</Label>
              <Input id="tx-date" type="date" {...register('date')} aria-invalid={!!errors.date} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-posted">Posted date <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="tx-posted" type="date" {...register('postedDate')} />
            </div>
            <div className="space-y-1.5">
              <Label>{type === 'transfer' ? 'From account' : 'Account'}</Label>
              <Select value={watch('accountId')} onValueChange={(v) => setValue('accountId', v)}>
                <SelectTrigger aria-label="Account"><SelectValue placeholder="Choose account" /></SelectTrigger>
                <SelectContent>
                  {accounts.filter((a) => !a.archived).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.accountId && <p className="text-xs text-destructive">{errors.accountId.message}</p>}
            </div>
            {type === 'transfer' ? (
              <div className="space-y-1.5">
                <Label>To account</Label>
                <Select value={watch('transferAccountId')} onValueChange={(v) => setValue('transferAccountId', v)}>
                  <SelectTrigger aria-label="Destination account"><SelectValue placeholder="Choose destination" /></SelectTrigger>
                  <SelectContent>
                    {accounts.filter((a) => !a.archived && a.id !== watch('accountId')).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              !splitMode && (
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={watch('categoryId') ?? ''} onValueChange={(v) => setValue('categoryId', v)}>
                    <SelectTrigger aria-label="Category"><SelectValue placeholder="Choose category" /></SelectTrigger>
                    <SelectContent>
                      {activeCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.group} · {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="tx-desc" {...register('description')} placeholder="Add a short description" />
          </div>

          {/* Split */}
          {type === 'expense' && (
            <div className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="split-toggle" className="text-sm font-medium">Split across categories</Label>
                <Switch id="split-toggle" checked={splitMode} onCheckedChange={setSplitMode} />
              </div>
              {splitMode && (
                <div className="mt-3 space-y-2">
                  {splits.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Select value={row.categoryId} onValueChange={(v) => setSplits(splits.map((r, j) => (j === i ? { ...r, categoryId: v } : r)))}>
                        <SelectTrigger className="flex-1" aria-label={`Split ${i + 1} category`}><SelectValue placeholder="Category" /></SelectTrigger>
                        <SelectContent>
                          {activeCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number" step="0.01" className="w-28" placeholder="0.00" aria-label={`Split ${i + 1} amount`}
                        value={row.amount || ''}
                        onChange={(e) => setSplits(splits.map((r, j) => (j === i ? { ...r, amount: Number(e.target.value) } : r)))}
                      />
                      <Button type="button" variant="ghost" size="icon" aria-label="Remove split" onClick={() => setSplits(splits.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setSplits([...splits, { categoryId: '', amount: 0 }])}>
                    <Plus className="mr-1 h-3.5 w-3.5" />Add split
                  </Button>
                  <p className={`text-xs ${splitError ? 'text-destructive' : 'text-muted-foreground'}`} aria-live="polite">
                    {splitError || `Fully allocated — ${formatCurrency(splitTotal)} of ${formatCurrency(amount || 0)}.`}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tx-tags">Tags <span className="text-muted-foreground">(comma separated)</span></Label>
              <Input id="tx-tags" {...register('tags')} placeholder="vacation, reimbursable" />
            </div>
            <div className="flex items-end gap-6 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={watch('recurring')} onCheckedChange={(v) => setValue('recurring', v)} aria-label="Recurring" />Recurring
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={watch('cleared')} onCheckedChange={(v) => setValue('cleared', v)} aria-label="Cleared" />Cleared
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-notes">Notes</Label>
            <Textarea id="tx-notes" rows={2} {...register('notes')} />
          </div>

          <Separator />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || (splitMode && !!splitError)}>
              {isSubmitting ? 'Saving…' : editing ? 'Save changes' : 'Add transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
