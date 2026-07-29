'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowDownUp, ChevronDown, ChevronLeft, ChevronRight, Download, Filter,
  MoreHorizontal, Plus, Search, Trash2, Upload, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAccounts } from '@/hooks/queries/useAccounts'
import { useCategories } from '@/hooks/queries/useCategories'
import { useTransactions, useUpdateTransaction, useBulkDeleteTransactions } from '@/hooks/queries/useTransactions'
import { TransactionDialog } from '@/components/financial/TransactionDialog'
import { PageHeader } from '@/components/shared/Misc'
import { EmptyState, LoadingSkeleton } from '@/components/shared/States'
import { Money } from '@/components/shared/Money'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { downloadCSV, formatCurrency, formatDate, round2 } from '@/lib/format'

import { cn } from '@/lib/utils'
import type { Transaction } from '@/types'

type SortKey = 'date' | 'merchant' | 'amount'

function TransactionsInner() {
  const { data: accounts = [] } = useAccounts()
  const categories = useCategories().data ?? []
  const updateTransactionMut = useUpdateTransaction()
  const bulkDeleteMut = useBulkDeleteTransactions()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [search, setSearch] = useState('')
  const [accountFilter, setAccountFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [selected, setSelected] = useState<string[]>([])
  const [expanded, setExpanded] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setEditing(null)
      setDialogOpen(true)
      const next = new URLSearchParams(searchParams.toString())
      next.delete('add')
      router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname)
    }
  }, [searchParams, pathname, router])

  // Server-side filters (from, to, categoryId, accountId, q) + pagination drive the API query.
  // The remaining refinements (type/status/source/amount/tag) and sorting are applied
  // client-side to the current page's rows, since the API doesn't support them.
  const queryFilters = useMemo(
    () => ({
      from: dateFrom || undefined,
      to: dateTo || undefined,
      categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
      accountId: accountFilter !== 'all' ? accountFilter : undefined,
      q: search || undefined,
      page,
      pageSize,
    }),
    [dateFrom, dateTo, categoryFilter, accountFilter, search, page, pageSize],
  )
  const { data, isLoading } = useTransactions(queryFilters)
  const items = useMemo(() => data?.items ?? [], [data])
  const total = data?.total ?? 0

  const filtered = useMemo(() => {
    let rows = items
    if (typeFilter !== 'all') rows = rows.filter((t) => t.type === typeFilter)
    if (statusFilter === 'cleared') rows = rows.filter((t) => t.cleared)
    if (statusFilter === 'pending') rows = rows.filter((t) => !t.cleared)
    if (statusFilter === 'recurring') rows = rows.filter((t) => t.recurring)
    if (sourceFilter !== 'all') rows = rows.filter((t) => t.importSource === sourceFilter)
    if (minAmount) rows = rows.filter((t) => t.amount >= Number(minAmount))
    if (maxAmount) rows = rows.filter((t) => t.amount <= Number(maxAmount))
    if (tagFilter) rows = rows.filter((t) => t.tags.some((tag) => tag.toLowerCase().includes(tagFilter.toLowerCase())))
    const dir = sortAsc ? 1 : -1
    return [...rows].sort((a, b) => {
      if (sortKey === 'date') return a.date.localeCompare(b.date) * dir
      if (sortKey === 'merchant') return a.merchant.localeCompare(b.merchant) * dir
      return (a.amount - b.amount) * dir
    })
  }, [items, typeFilter, statusFilter, sourceFilter, minAmount, maxAmount, tagFilter, sortKey, sortAsc])

  // Metrics reflect the currently loaded page (post client-side refinement), not every
  // transaction matching the filters across all pages — an aggregate endpoint would be
  // needed for exact totals across the full filtered set.
  const metrics = useMemo(() => {
    const income = round2(filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0))
    const spending = round2(filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0))
    return { income, spending, net: round2(income - spending), count: filtered.length }
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pageRows = filtered
  const allSelected = pageRows.length > 0 && pageRows.every((t) => selected.includes(t.id))

  const updateTransaction = (
    id: string, patch: Partial<Transaction>,
    opts?: { onSuccess?: () => void; onError?: () => void },
  ) => updateTransactionMut.mutate({ id, patch }, opts)
  const deleteTransactions = (
    ids: string[],
    opts?: { onSuccess?: () => void; onError?: () => void },
  ) => bulkDeleteMut.mutate(ids, opts)

  const activeFilterCount = [accountFilter, categoryFilter, typeFilter, statusFilter, sourceFilter, dateFrom, dateTo, minAmount, maxAmount, tagFilter]
    .filter((v) => v && v !== 'all').length

  const clearFilters = () => {
    setAccountFilter('all'); setCategoryFilter('all'); setTypeFilter('all'); setStatusFilter('all')
    setSourceFilter('all'); setDateFrom(''); setDateTo(''); setMinAmount(''); setMaxAmount(''); setTagFilter('')
  }

  const exportCSV = () => {
    downloadCSV(
      `finpilot-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Date', 'Merchant', 'Account', 'Category', 'Type', 'Amount', 'Status', 'Tags'],
      filtered.map((t) => [
        t.date, t.merchant,
        accounts.find((a) => a.id === t.accountId)?.name ?? '',
        categories.find((c) => c.id === t.categoryId)?.name ?? (t.splits?.length ? 'Split' : ''),
        t.type, t.type === 'expense' ? -t.amount : t.amount,
        t.cleared ? 'Cleared' : 'Pending', t.tags.join('; '),
      ]),
    )
    toast.success(`Exported ${filtered.length} transactions to CSV.`)
  }

  const bulkSetCategory = async (categoryId: string) => {
    const count = selected.length
    try {
      await Promise.all(selected.map((id) => updateTransactionMut.mutateAsync({ id, patch: { categoryId } })))
      toast.success(`Updated category for ${count} transactions.`)
    } catch {
      toast.error('Could not update category for all selected transactions. Please try again.')
    }
    setSelected([])
  }

  const sort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(key === 'merchant') }
  }

  const filterControls = (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">From date</label>
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">To date</label>
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Account</label>
          <Select value={accountFilter} onValueChange={(v) => { setAccountFilter(v); setPage(1) }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Category</label>
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.filter((c) => !c.archived).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              <SelectItem value="cleared">Cleared</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="recurring">Recurring</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Import source</label>
          <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1) }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any source</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="csv">CSV import</SelectItem>
              <SelectItem value="sample">Sample data</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Tags</label>
          <Input placeholder="e.g. vacation" value={tagFilter} onChange={(e) => { setTagFilter(e.target.value); setPage(1) }} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Min amount</label>
          <Input type="number" placeholder="0" value={minAmount} onChange={(e) => { setMinAmount(e.target.value); setPage(1) }} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Max amount</label>
          <Input type="number" placeholder="Any" value={maxAmount} onChange={(e) => { setMaxAmount(e.target.value); setPage(1) }} />
        </div>
      </div>
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters}><X className="mr-1 h-3.5 w-3.5" />Clear {activeFilterCount} filters</Button>
      )}
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Every dollar in and out — searchable, filterable, exportable."
        actions={
          <>
            <Button asChild variant="outline"><Link href="/app/transactions/import"><Upload className="mr-1.5 h-4 w-4" />Import CSV</Link></Button>
            <Button variant="outline" onClick={exportCSV}><Download className="mr-1.5 h-4 w-4" />Export</Button>
            <Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="mr-1.5 h-4 w-4" />Add transaction</Button>
          </>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total income', value: metrics.income, cls: 'text-success' },
          { label: 'Total spending', value: metrics.spending, cls: '' },
          { label: 'Net cash flow', value: metrics.net, cls: metrics.net >= 0 ? 'text-success' : 'text-destructive' },
        ].map((m) => (
          <Card key={m.label} className="shadow-card">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
              <Money value={m.value} className={cn('mt-1 block text-xl font-bold', m.cls)} decimals={0} />
            </CardContent>
          </Card>
        ))}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Transactions</p>
            <p className="mt-1 text-xl font-bold tnum">{metrics.count}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search merchant, description, notes…" className="pl-9" aria-label="Search transactions" />
        </div>
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="mr-1.5 h-4 w-4" />Filters
              {activeFilterCount > 0 && <Badge className="ml-1.5 h-5 px-1.5 text-[10px]">{activeFilterCount}</Badge>}
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader><SheetTitle>Filter transactions</SheetTitle></SheetHeader>
            <div className="mt-6">{filterControls}</div>
          </SheetContent>
        </Sheet>
        {selected.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5">
            <span className="text-sm font-medium">{selected.length} selected</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="sm" variant="outline">Set category<ChevronDown className="ml-1 h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent>
                {categories.filter((c) => !c.archived).map((c) => (
                  <DropdownMenuItem key={c.id} onClick={() => bulkSetCategory(c.id)}>{c.name}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" onClick={async () => {
              const count = selected.length
              try {
                await Promise.all(selected.map((id) => {
                  const t = items.find((x) => x.id === id)
                  return t ? updateTransactionMut.mutateAsync({ id, patch: { tags: [...new Set([...t.tags, 'reviewed'])] } }) : Promise.resolve()
                }))
                toast.success(`Added tag to ${count} transactions.`)
              } catch {
                toast.error('Could not tag all selected transactions. Please try again.')
              }
              setSelected([])
            }}>Tag</Button>
            <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button>
          </div>
        )}
      </div>

      {/* Table (desktop) / cards (mobile) */}
      <Card className="mt-4 shadow-card">
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSkeleton rows={5} className="p-6" />
          ) : filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title={total === 0 ? 'No transactions yet' : 'Nothing matches your filters'}
                description={total === 0
                  ? 'Add your first transaction or import a CSV file to begin tracking spending.'
                  : 'Try widening the date range or clearing some filters.'}
                actionLabel={total === 0 ? 'Add transaction' : undefined}
                onAction={total === 0 ? () => setDialogOpen(true) : undefined}
              />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={(v) => setSelected(v ? [...new Set([...selected, ...pageRows.map((t) => t.id)])] : selected.filter((id) => !pageRows.some((t) => t.id === id)))}
                          aria-label="Select all on page"
                        />
                      </TableHead>
                      <TableHead>
                        <button className="flex items-center gap-1 font-medium" onClick={() => sort('date')}>Date<ArrowDownUp className="h-3 w-3" /></button>
                      </TableHead>
                      <TableHead>
                        <button className="flex items-center gap-1 font-medium" onClick={() => sort('merchant')}>Merchant<ArrowDownUp className="h-3 w-3" /></button>
                      </TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">
                        <button className="ml-auto flex items-center gap-1 font-medium" onClick={() => sort('amount')}>Amount<ArrowDownUp className="h-3 w-3" /></button>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((t) => {
                      const isExpanded = expanded.includes(t.id)
                      return (
                        <>
                          <TableRow key={t.id} className="group">
                            <TableCell>
                              <Checkbox
                                checked={selected.includes(t.id)}
                                onCheckedChange={(v) => setSelected(v ? [...selected, t.id] : selected.filter((id) => id !== t.id))}
                                aria-label={`Select ${t.merchant}`}
                              />
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm tnum">{formatDate(t.date, 'MMM d, yyyy')}</TableCell>
                            <TableCell>
                              <button className="text-left" onClick={() => setExpanded(isExpanded ? expanded.filter((x) => x !== t.id) : [...expanded, t.id])}>
                                <span className="block max-w-52 truncate text-sm font-medium">{t.merchant}</span>
                                {t.description && <span className="block max-w-52 truncate text-xs text-muted-foreground">{t.description}</span>}
                              </button>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{accounts.find((a) => a.id === t.accountId)?.name ?? '—'}</TableCell>
                            <TableCell>
                              {t.splits?.length ? (
                                <Badge variant="secondary" className="text-[11px]">Split · {t.splits.length}</Badge>
                              ) : (
                                <Select value={t.categoryId ?? 'none'} onValueChange={(v) => updateTransaction(t.id, { categoryId: v === 'none' ? undefined : v })}>
                                  <SelectTrigger className="h-8 w-40 border-transparent bg-transparent text-sm hover:border-border" aria-label="Edit category">
                                    <SelectValue placeholder="Uncategorized" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Uncategorized</SelectItem>
                                    {categories.filter((c) => !c.archived && (t.type === 'income' ? c.group === 'Income' : c.group !== 'Income')).map((c) => (
                                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn('text-[11px] capitalize',
                                t.type === 'income' && 'border-transparent bg-success-muted text-success',
                                t.type === 'transfer' && 'border-transparent bg-info-muted text-info')}>
                                {t.type}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn('text-right text-sm font-semibold tnum', t.type === 'income' && 'text-success')}>
                              {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}{formatCurrency(t.amount)}
                            </TableCell>
                            <TableCell>
                              <span className={cn('inline-flex items-center gap-1 text-xs', t.cleared ? 'text-success' : 'text-warning')}>
                                <span className={cn('h-1.5 w-1.5 rounded-full', t.cleared ? 'bg-success' : 'bg-warning')} />
                                {t.cleared ? 'Cleared' : 'Pending'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Transaction actions"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setEditing(t); setDialogOpen(true) }}>Edit</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setEditing({ ...t, splits: t.splits ?? [] }); setDialogOpen(true) }}>Split transaction</DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => {
                                    deleteTransactions([t.id], {
                                      onSuccess: () => toast.success('Transaction deleted.'),
                                      onError: () => toast.error('Could not delete this transaction. Please try again.'),
                                    })
                                  }}>Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${t.id}-x`} className="bg-muted/40">
                              <TableCell colSpan={9} className="py-3">
                                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                                  <span>Posted: {t.postedDate ? formatDate(t.postedDate) : '—'}</span>
                                  <span>Source: {t.importSource ?? 'manual'}{t.recurring ? ' · Recurring' : ''}</span>
                                  <span>Tags: {t.tags.length ? t.tags.join(', ') : '—'}</span>
                                  {t.notes && <span className="sm:col-span-3">Notes: {t.notes}</span>}
                                  {t.splits?.map((s) => (
                                    <span key={s.id}>Split: {categories.find((c) => c.id === s.categoryId)?.name} — {formatCurrency(s.amount)}</span>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <ul className="divide-y md:hidden">
                {pageRows.map((t) => {
                  const cat = categories.find((c) => c.id === t.categoryId)
                  return (
                    <li key={t.id} className="flex items-center gap-3 p-4">
                      <Checkbox
                        checked={selected.includes(t.id)}
                        onCheckedChange={(v) => setSelected(v ? [...selected, t.id] : selected.filter((id) => id !== t.id))}
                        aria-label={`Select ${t.merchant}`}
                      />
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <CategoryIcon icon={cat?.icon ?? 'shopping-bag'} />
                      </div>
                      <button className="min-w-0 flex-1 text-left" onClick={() => { setEditing(t); setDialogOpen(true) }}>
                        <p className="truncate text-sm font-medium">{t.merchant}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(t.date, 'MMM d')} · {t.splits?.length ? `Split · ${t.splits.length}` : cat?.name ?? 'Uncategorized'}</p>
                      </button>
                      <span className={cn('text-sm font-semibold tnum', t.type === 'income' && 'text-success')}>
                        {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}{formatCurrency(t.amount)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground tnum">
            {filtered.length !== items.length
              ? <>Showing {filtered.length} of {total} (page {page} of {totalPages})</>
              : <>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</>}
          </p>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
              <SelectTrigger className="w-28" aria-label="Rows per page"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 15, 25, 50].map((n) => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm tnum">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.length} transactions?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. Budgets and reports will update immediately.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteTransactions(selected, {
                  onSuccess: () => { toast.success('Transactions deleted.'); setSelected([]) },
                  onError: () => toast.error('Could not delete these transactions. Please try again.'),
                })
              }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={null}>
      <TransactionsInner />
    </Suspense>
  )
}
