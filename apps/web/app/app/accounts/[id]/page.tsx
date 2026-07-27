'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { format, parseISO, subMonths } from 'date-fns'
import { Archive, ArrowLeft, ArrowDownLeft, ArrowUpRight, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/stores/useStore'
import { useAccounts, useUpdateAccount } from '@/hooks/queries/useAccounts'
import { AccountDialog } from '@/components/financial/AccountDialog'
import { ChartCard, PageHeader } from '@/components/shared/Misc'
import { Money } from '@/components/shared/Money'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/shared/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate, round2 } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { transactions, categories } = useStore()
  const { data: accounts = [], isLoading } = useAccounts()
  const updateAccountMut = useUpdateAccount()
  const [editOpen, setEditOpen] = useState(false)
  const account = accounts.find((a) => a.id === id)

  const related = useMemo(
    () => transactions.filter((t) => t.accountId === id).sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, id])

  const history = useMemo(() => {
    if (!account) return []
    // Reconstruct approximate balance history by walking transactions backward
    const points: { date: string; balance: number }[] = []
    let balance = account.balance
    const now = new Date()
    for (let m = 5; m >= 0; m--) {
      const d = subMonths(now, m)
      const key = format(d, 'yyyy-MM')
      points.push({ date: format(d, 'MMM'), balance: round2(balance) })
      // reverse this month's net change for next (older) point
      const net = related
        .filter((t) => t.date.startsWith(key))
        .reduce((s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0)
      balance = round2(balance - net)
    }
    return points
  }, [account, related])

  const stats = useMemo(() => {
    const month = format(new Date(), 'yyyy-MM')
    const thisMonth = related.filter((t) => t.date.startsWith(month))
    const inflow = round2(thisMonth.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0))
    const outflow = round2(thisMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0))
    const largest = [...related].sort((a, b) => b.amount - a.amount).slice(0, 3)
    const byCat = new Map<string, number>()
    for (const t of related.filter((x) => x.type === 'expense').slice(0, 200)) {
      if (t.categoryId) byCat.set(t.categoryId, round2((byCat.get(t.categoryId) ?? 0) + t.amount))
    }
    const topCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
    return { inflow, outflow, largest, topCats }
  }, [related])

  if (isLoading) {
    return <LoadingSkeleton rows={4} className="mt-6" />
  }

  if (!account) {
    return (
      <ErrorState
        title="Account not found"
        description="This account may have been deleted. Head back to the accounts list."
        onRetry={() => router.push('/app/accounts')}
      />
    )
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push('/app/accounts')}>
        <ArrowLeft className="mr-1 h-4 w-4" />All accounts
      </Button>
      <PageHeader
        title={account.name}
        description={`${account.institution} · Updated ${formatDate(account.lastUpdated, 'MMM d, yyyy')}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
            <Button variant="outline" onClick={() => { updateAccountMut.mutate({ id: account.id, patch: { archived: true } }); toast.success('Account archived.'); router.push('/app/accounts') }}>
              <Archive className="mr-1.5 h-4 w-4" />Archive
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-1">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">Current balance</p>
            <Money value={account.balance} className={cn('mt-1 block text-3xl font-bold', account.balance < 0 && 'text-destructive')} />
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Inflow this month</span><Money value={stats.inflow} className="font-medium text-success" decimals={0} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Outflow this month</span><Money value={stats.outflow} className="font-medium" decimals={0} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Transactions</span><span className="font-medium tnum">{related.length}</span></div>
              {account.creditLimit && (
                <div className="flex justify-between"><span className="text-muted-foreground">Utilization</span><span className="font-medium tnum">{Math.round((Math.abs(account.balance) / account.creditLimit) * 100)}% of {formatCurrency(account.creditLimit, { decimals: 0 })}</span></div>
              )}
              {account.apr && <div className="flex justify-between"><span className="text-muted-foreground">APR</span><span className="font-medium tnum">{account.apr}%</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">In net worth</span><span className="font-medium">{account.includeInNetWorth ? 'Yes' : 'No'}</span></div>
            </div>
            {stats.topCats.length > 0 && (
              <div className="mt-4 border-t pt-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Top spending categories</p>
                <ul className="space-y-1.5">
                  {stats.topCats.map(([cid, amt]) => {
                    const cat = categories.find((c) => c.id === cid)
                    return (
                      <li key={cid} className="flex items-center gap-2 text-sm">
                        <CategoryIcon icon={cat?.icon ?? 'shopping-bag'} className="text-muted-foreground" />
                        <span className="flex-1 truncate">{cat?.name ?? 'Other'}</span>
                        <Money value={amt} className="tnum" decimals={0} />
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <ChartCard title="Balance history" description="Approximate, reconstructed from transactions" className="lg:col-span-2"
          summary={`Balance currently ${formatCurrency(account.balance, { decimals: 0 })}.`}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} width={44} />
                <RTooltip formatter={(v: number) => formatCurrency(v, { decimals: 0 })} />
                <Area type="monotone" dataKey="balance" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1)/0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {stats.largest.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Largest transactions</p>
              <div className="flex flex-wrap gap-2">
                {stats.largest.map((t) => (
                  <span key={t.id} className="rounded-lg bg-muted px-2.5 py-1 text-xs tnum">
                    {t.merchant} · {formatCurrency(t.amount, { decimals: 0 })}
                  </span>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Transactions" description={`${related.length} total`} className="mt-4">
        {related.length === 0 ? (
          <EmptyState title="No transactions on this account" description="Add a transaction or import a CSV for this account." actionLabel="Add transaction" actionHref="/app/transactions?add=1" />
        ) : (
          <ul className="divide-y">
            {related.slice(0, 15).map((t) => {
              const cat = categories.find((c) => c.id === t.categoryId)
              return (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', t.type === 'income' ? 'bg-success-muted text-success' : 'bg-muted text-muted-foreground')}>
                    {t.type === 'income' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.merchant}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(parseISO(t.date), 'MMM d, yyyy')} · {cat?.name ?? 'Uncategorized'}</p>
                  </div>
                  <Money value={t.type === 'income' ? t.amount : -t.amount} sign className={cn('text-sm font-semibold', t.type === 'income' && 'text-success')} />
                </li>
              )
            })}
          </ul>
        )}
        {related.length > 15 && (
          <Button asChild variant="outline" className="mt-3 w-full">
            <Link href="/app/transactions">View all in Transactions</Link>
          </Button>
        )}
      </ChartCard>

      <AccountDialog open={editOpen} onOpenChange={setEditOpen} editing={account} />
    </div>
  )
}
