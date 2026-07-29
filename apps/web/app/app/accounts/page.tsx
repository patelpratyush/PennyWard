'use client'
import { Suspense, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Archive, ArchiveRestore, Landmark, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAccounts, useUpdateAccount, useDeleteAccount } from '@/hooks/queries/useAccounts'
import { PageHeader } from '@/components/shared/Misc'
import { Money } from '@/components/shared/Money'
import { EmptyState, LoadingSkeleton } from '@/components/shared/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AccountDialog } from '@/components/financial/AccountDialog'
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

function AccountsInner() {
  const { data: accounts = [], isLoading } = useAccounts()
  const updateAccountMut = useUpdateAccount()
  const deleteAccountMut = useDeleteAccount()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [deleting, setDeleting] = useState<Account | null>(null)
  const [adjusting, setAdjusting] = useState<Account | null>(null)
  const [adjustValue, setAdjustValue] = useState('')

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setEditing(null)
      setDialogOpen(true)
      const next = new URLSearchParams(searchParams.toString())
      next.delete('add')
      router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname)
    }
  }, [searchParams, pathname, router])

  const nw = netWorth(accounts)
  const active = accounts.filter((a) => !a.archived)
  const archived = accounts.filter((a) => a.archived)

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Accounts" description="Every place your money lives — and what you owe." />
        <LoadingSkeleton rows={4} className="mt-6" />
      </div>
    )
  }

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
                          <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => router.push(`/app/accounts/${a.id}`)}>
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
                              <DropdownMenuItem onClick={() => {
                                updateAccountMut.mutate({ id: a.id, patch: { includeInNetWorth: !a.includeInNetWorth } }, {
                                  onSuccess: () => toast.success(a.includeInNetWorth ? 'Excluded from net worth.' : 'Included in net worth.'),
                                  onError: () => toast.error('Could not update this account. Please try again.'),
                                })
                              }}>
                                {a.includeInNetWorth ? 'Exclude from' : 'Include in'} net worth
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {
                                updateAccountMut.mutate({ id: a.id, patch: { archived: true } }, {
                                  onSuccess: () => toast.success('Account archived.'),
                                  onError: () => toast.error('Could not archive this account. Please try again.'),
                                })
                              }}>
                                <Archive className="mr-2 h-4 w-4" />Archive
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(a)}>
                                <Trash2 className="mr-2 h-4 w-4" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <button className="mt-3 flex w-full items-end justify-between text-left" onClick={() => router.push(`/app/accounts/${a.id}`)}>
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
                    <Button variant="ghost" size="sm" onClick={() => {
                      updateAccountMut.mutate({ id: a.id, patch: { archived: false } }, {
                        onSuccess: () => toast.success('Account restored.'),
                        onError: () => toast.error('Could not restore this account. Please try again.'),
                      })
                    }}>
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
                updateAccountMut.mutate({ id: adjusting.id, patch: { balance: round2(Math.abs(Number(adjustValue)) * sign) } }, {
                  onSuccess: () => toast.success('Balance updated.'),
                  onError: () => toast.error('Could not update the balance. Please try again.'),
                })
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
              This permanently deletes the account and every transaction linked to it — this cannot be undone. Consider archiving instead if you want to keep the transaction history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleting) {
                  deleteAccountMut.mutate(deleting.id, {
                    onSuccess: () => toast.success('Account deleted.'),
                    onError: () => toast.error('Could not delete this account. Please try again.'),
                  })
                }
              }}>
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function AccountsPage() {
  return (
    <Suspense fallback={null}>
      <AccountsInner />
    </Suspense>
  )
}
