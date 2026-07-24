import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Archive, ArchiveRestore, Landmark, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/stores/useStore'
import { PageHeader } from '@/components/shared/Misc'
import { Money } from '@/components/shared/Money'
import { EmptyState } from '@/components/shared/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { netWorth } from '@/lib/finance/budget'
import { formatCurrency, formatDate, round2 } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Account, AccountType } from '@/types'

const groups: { key: string; label: string; types: AccountType[] }[] = [
  { key: 'cash', label: 'Cash & banking', types: ['checking', 'savings', 'cash'] },
  { key: 'credit', label: 'Credit cards', types: ['credit_card'] },
  { key: 'loans', label: 'Loans', types: ['auto_loan', 'student_loan', 'mortgage', 'personal_loan'] },
  { key: 'invest', label: 'Investments', types: ['investment'] },
  { key: 'other', label: 'Other', types: ['other'] },
]

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
  const { addAccount, updateAccount } = useStore()
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
      updateAccount(editing.id, payload)
      toast.success('Account updated.')
    } else {
      addAccount(payload)
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

export default function Accounts() {
  const { accounts, updateAccount, deleteAccount } = useStore()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [deleting, setDeleting] = useState<Account | null>(null)
  const [adjusting, setAdjusting] = useState<Account | null>(null)
  const [adjustValue, setAdjustValue] = useState('')

  useEffect(() => {
    if (params.get('add') === '1') {
      setEditing(null)
      setDialogOpen(true)
      params.delete('add')
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  const nw = netWorth(accounts)
  const active = accounts.filter((a) => !a.archived)
  const archived = accounts.filter((a) => a.archived)

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Every place your money lives — and what you owe."
        actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="mr-1.5 h-4 w-4" />Add account</Button>}
      />

      {/* Net worth summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">Assets</p><Money value={nw.assets} className="mt-1 block text-xl font-bold text-success" decimals={0} /></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">Liabilities</p><Money value={nw.liabilities} className="mt-1 block text-xl font-bold text-destructive" decimals={0} /></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">Net worth</p><Money value={nw.netWorth} className="mt-1 block text-xl font-bold" decimals={0} /></CardContent></Card>
      </div>

      {active.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<Landmark className="h-6 w-6" />}
            title="No accounts yet"
            description="Add your checking, savings, credit cards, and loans to build your net-worth picture."
            actionLabel="Add account"
            onAction={() => setDialogOpen(true)}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {groups.map((g) => {
            const list = active.filter((a) => g.types.includes(a.type))
            if (!list.length) return null
            const subtotal = round2(list.reduce((s, a) => s + a.balance, 0))
            return (
              <section key={g.key}>
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground">{g.label}</h2>
                  <span className={cn('text-sm font-semibold tnum', subtotal < 0 && 'text-destructive')}>{formatCurrency(subtotal, { decimals: 0 })}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {list.map((a) => (
                    <Card key={a.id} className="group shadow-card transition-shadow hover:shadow-lift">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => navigate(`/app/accounts/${a.id}`)}>
                            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', a.balance < 0 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary')}>
                              <Landmark className="h-5 w-5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold group-hover:underline">{a.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">{a.institution} · {typeLabels[a.type]}</span>
                            </span>
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`${a.name} actions`}><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditing(a); setDialogOpen(true) }}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setAdjusting(a); setAdjustValue(String(Math.abs(a.balance))) }}>Adjust balance</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { updateAccount(a.id, { includeInNetWorth: !a.includeInNetWorth }); toast.success(a.includeInNetWorth ? 'Excluded from net worth.' : 'Included in net worth.') }}>
                                {a.includeInNetWorth ? 'Exclude from' : 'Include in'} net worth
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { updateAccount(a.id, { archived: true }); toast.success('Account archived.') }}>
                                <Archive className="mr-2 h-4 w-4" />Archive
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(a)}>
                                <Trash2 className="mr-2 h-4 w-4" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <button className="mt-3 flex w-full items-end justify-between text-left" onClick={() => navigate(`/app/accounts/${a.id}`)}>
                          <div>
                            <Money value={a.balance} className={cn('text-xl font-bold', a.balance < 0 && 'text-destructive')} />
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {a.creditLimit ? `${Math.round((Math.abs(a.balance) / a.creditLimit) * 100)}% of ${formatCurrency(a.creditLimit, { decimals: 0 })} limit · ` : ''}
                              Updated {formatDate(a.lastUpdated, 'MMM d')}
                            </p>
                          </div>
                          {!a.includeInNetWorth && <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Not in net worth</span>}
                        </button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )
          })}

          {archived.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Archived</h2>
              <div className="space-y-2">
                {archived.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
                    <Archive className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">{a.name}</span>
                    <Money value={a.balance} className="text-sm text-muted-foreground" />
                    <Button variant="ghost" size="sm" onClick={() => updateAccount(a.id, { archived: false })}>
                      <ArchiveRestore className="mr-1 h-3.5 w-3.5" />Restore
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />

      {/* Balance adjustment */}
      <Dialog open={!!adjusting} onOpenChange={() => setAdjusting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust balance — {adjusting?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter the current balance reported by your institution.</p>
            <Input type="number" step="0.01" value={adjustValue} onChange={(e) => setAdjustValue(e.target.value)} aria-label="New balance" />
            <Button className="w-full" onClick={() => {
              if (adjusting) {
                const sign = adjusting.balance < 0 ? -1 : 1
                updateAccount(adjusting.id, { balance: round2(Math.abs(Number(adjustValue)) * sign) })
                toast.success('Balance updated.')
              }
              setAdjusting(null)
            }}>Save balance</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The account will be removed permanently. Transactions assigned to it will remain but show no account. Consider archiving instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleting) { deleteAccount(deleting.id); toast.success('Account deleted.') } }}>
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
