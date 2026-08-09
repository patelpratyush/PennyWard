'use client'
import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Papa from 'papaparse'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from 'recharts'
import { FileUp, Info, Plus, Search, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { useHoldings, useCreateHolding, useDeleteHolding, useImportHoldings } from '@/hooks/queries/useHoldings'
import { useAccounts } from '@/hooks/queries/useAccounts'
import { PageHeader } from '@/components/shared/Misc'
import { EmptyState, LoadingSkeleton } from '@/components/shared/States'
import { Money } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { searchStocks } from '@/services/stocks'
import { useQuotes } from '@/hooks/queries/useQuotes'
import { formatCurrency, round2 } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ImportRow {
  ticker: string
  shares: number
  costBasis?: number
  valid: boolean
}

const SAMPLE_HOLDINGS_CSV = `Ticker,Shares,Cost Basis\nAAPL,10,180.50\nMSFT,5,340.00\nVTI,20,245.75`

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-6))', 'hsl(var(--chart-7))', 'hsl(var(--chart-8))']

export default function Portfolio() {
  const holdingsQ = useHoldings()
  const holdings = holdingsQ.data ?? []
  const createHolding = useCreateHolding()
  const deleteHolding = useDeleteHolding()
  const { data: accounts = [] } = useAccounts()
  const investmentAccounts = accounts.filter((a) => a.type === 'investment' && !a.archived)

  const importHoldings = useImportHoldings()
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [ticker, setTicker] = useState('')
  const [shares, setShares] = useState('')
  const [costBasis, setCostBasis] = useState('')
  const [accountId, setAccountId] = useState('')

  const [importOpen, setImportOpen] = useState(false)
  const [importFileName, setImportFileName] = useState('')
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [importAccountId, setImportAccountId] = useState('')
  const importInputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => searchStocks(search), [search])
  const holdingTickers = useMemo(() => holdings.map((h) => h.ticker), [holdings])
  const quotesQ = useQuotes(holdingTickers)

  const rows = useMemo(() => holdings.map((h) => {
    const quote = quotesQ.resolve(h.ticker)
    const marketValue = quote ? round2(quote.price * h.shares) : null
    const costTotal = h.costBasis != null ? round2(h.costBasis * h.shares) : null
    const gain = marketValue != null && costTotal != null ? round2(marketValue - costTotal) : null
    const gainPct = gain != null && costTotal ? round2((gain / costTotal) * 100) : null
    const dayChange = quote ? round2(quote.change * h.shares) : null
    return { holding: h, quote, marketValue, costTotal, gain, gainPct, dayChange }
  }), [holdings, quotesQ.data])

  const totals = useMemo(() => {
    const totalValue = round2(rows.reduce((s, r) => s + (r.marketValue ?? 0), 0))
    const totalCost = round2(rows.reduce((s, r) => s + (r.costTotal ?? 0), 0))
    const totalGain = round2(totalValue - totalCost)
    const totalGainPct = totalCost > 0 ? round2((totalGain / totalCost) * 100) : 0
    const totalDayChange = round2(rows.reduce((s, r) => s + (r.dayChange ?? 0), 0))
    return { totalValue, totalCost, totalGain, totalGainPct, totalDayChange }
  }, [rows])

  const allocation = useMemo(
    () => rows.filter((r) => r.marketValue).map((r) => ({ name: r.holding.ticker, value: r.marketValue! })).sort((a, b) => b.value - a.value),
    [rows])

  const resetForm = () => { setTicker(''); setShares(''); setCostBasis(''); setAccountId(''); setSearch('') }

  const addHolding = () => {
    createHolding.mutate(
      {
        ticker, shares: Number(shares),
        costBasis: costBasis ? round2(Number(costBasis)) : undefined,
        accountId: accountId || null,
      },
      {
        onSuccess: () => { toast.success(`${ticker} added to your portfolio.`); setAddOpen(false); resetForm() },
        onError: () => toast.error('Could not add this holding.'),
      },
    )
  }

  const parseHoldingsFile = (file: File) => {
    setImportFileName(file.name)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const hdrs = res.meta.fields ?? []
        const find = (candidates: string[]) => hdrs.find((h) => candidates.some((c) => h.toLowerCase().includes(c)))
        const tickerCol = find(['ticker', 'symbol'])
        const sharesCol = find(['shares', 'quantity', 'qty'])
        const costCol = find(['cost basis', 'cost', 'avg price', 'price paid'])
        const parsed: ImportRow[] = res.data.map((r) => {
          const ticker = (tickerCol ? r[tickerCol] : '').trim().toUpperCase()
          const shares = sharesCol ? Number(r[sharesCol]) : NaN
          const costRaw = costCol ? r[costCol] : ''
          const costBasis = costRaw ? Number(costRaw.replace(/[$,]/g, '')) : undefined
          return { ticker, shares, costBasis, valid: !!ticker && Number.isFinite(shares) && shares > 0 }
        })
        setImportRows(parsed)
        toast.success(`Parsed ${res.data.length} rows from ${file.name}.`)
      },
      error: () => toast.error('We could not read that file. Make sure it is a valid CSV.'),
    })
  }

  const useSampleHoldings = () => {
    const blob = new Blob([SAMPLE_HOLDINGS_CSV], { type: 'text/csv' })
    parseHoldingsFile(new File([blob], 'sample-holdings.csv', { type: 'text/csv' }))
  }

  const validImportRows = importRows.filter((r) => r.valid)

  const resetImport = () => { setImportFileName(''); setImportRows([]); setImportAccountId('') }

  const doImportHoldings = () => {
    importHoldings.mutate(
      { accountId: importAccountId || null, rows: validImportRows.map(({ ticker, shares, costBasis }) => ({ ticker, shares, costBasis })) },
      {
        onSuccess: (res) => {
          toast.success(`${res.imported} holdings imported.`)
          setImportOpen(false)
          resetImport()
        },
        onError: () => toast.error('Could not import holdings.'),
      },
    )
  }

  if (holdingsQ.isLoading) {
    return (
      <div>
        <PageHeader title="Portfolio" description="Shares you own — cost basis, market value, and gain/loss." />
        <LoadingSkeleton rows={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Portfolio"
        description="Shares you own — cost basis, market value, and gain/loss."
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}><FileUp className="mr-1.5 h-4 w-4" />Import CSV</Button>
            <Button onClick={() => setAddOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Add holding</Button>
          </>
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-lg bg-info-muted px-3 py-2 text-xs text-info">
        <Info className="h-4 w-4 shrink-0" />
        Prices are simulated demo data, not live market data. Educational purposes only — not financial advice.
      </div>

      {holdings.length === 0 ? (
        <EmptyState
          title="No holdings yet"
          description="Add a position to track cost basis, market value, and gain/loss over time."
          actionLabel="Add holding"
          onAction={() => setAddOpen(true)}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="shadow-card"><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total value</p>
              <Money value={totals.totalValue} className="mt-1 block text-xl font-bold" decimals={0} />
            </CardContent></Card>
            <Card className="shadow-card"><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total gain/loss</p>
              <p className={cn('mt-1 flex items-center gap-1 text-xl font-bold tnum', totals.totalGain >= 0 ? 'text-success' : 'text-destructive')}>
                {totals.totalGain >= 0 ? '+' : ''}{formatCurrency(totals.totalGain, { decimals: 0 })}
                <span className="text-xs font-medium">({totals.totalGain >= 0 ? '+' : ''}{totals.totalGainPct.toFixed(1)}%)</span>
              </p>
            </CardContent></Card>
            <Card className="shadow-card"><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Day change</p>
              <p className={cn('mt-1 flex items-center gap-1 text-xl font-bold tnum', totals.totalDayChange >= 0 ? 'text-success' : 'text-destructive')}>
                {totals.totalDayChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {totals.totalDayChange >= 0 ? '+' : ''}{formatCurrency(totals.totalDayChange, { decimals: 0 })}
              </p>
            </CardContent></Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card className="shadow-card lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Holdings</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticker</TableHead>
                      <TableHead className="text-right">Shares</TableHead>
                      <TableHead className="text-right">Cost basis</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Market value</TableHead>
                      <TableHead className="text-right">Gain/loss</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.holding.id}>
                        <TableCell>
                          <Link href={`/app/stocks/${r.holding.ticker}`} className="font-semibold hover:underline">{r.holding.ticker}</Link>
                        </TableCell>
                        <TableCell className="text-right tnum">{r.holding.shares}</TableCell>
                        <TableCell className="text-right tnum">{r.holding.costBasis != null ? formatCurrency(r.holding.costBasis) : '—'}</TableCell>
                        <TableCell className="text-right tnum">{r.quote ? formatCurrency(r.quote.price) : '—'}</TableCell>
                        <TableCell className="text-right tnum font-medium">{r.marketValue != null ? formatCurrency(r.marketValue, { decimals: 0 }) : '—'}</TableCell>
                        <TableCell className={cn('text-right tnum', r.gain != null && (r.gain >= 0 ? 'text-success' : 'text-destructive'))}>
                          {r.gain != null ? `${r.gain >= 0 ? '+' : ''}${formatCurrency(r.gain, { decimals: 0 })} (${r.gainPct! >= 0 ? '+' : ''}${r.gainPct!.toFixed(1)}%)` : '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8" aria-label={`Remove ${r.holding.ticker}`}
                            onClick={() => deleteHolding.mutate(r.holding.id, {
                              onSuccess: () => toast.success(`${r.holding.ticker} removed.`),
                              onError: () => toast.error('Could not remove this holding.'),
                            })}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Allocation</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="h-48 w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={allocation} dataKey="value" innerRadius={50} outerRadius={85} paddingAngle={2} strokeWidth={0}>
                        {allocation.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <RTooltip formatter={(v: number) => formatCurrency(v, { decimals: 0 })} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-full space-y-1 text-xs">
                  {allocation.map((a, i) => (
                    <li key={a.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="flex-1 truncate">{a.name}</span>
                      <span className="font-semibold tnum">{formatCurrency(a.value, { decimals: 0 })}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) resetForm() }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add holding</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Ticker</Label>
              {ticker ? (
                <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span className="font-semibold">{ticker}</span>
                  <button className="text-xs text-muted-foreground hover:underline" onClick={() => setTicker('')}>Change</button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search companies or tickers…" className="pl-9" aria-label="Search stocks" />
                  {search && (
                    <Card className="absolute inset-x-0 top-11 z-20 max-h-56 overflow-y-auto shadow-lift">
                      <CardContent className="p-1">
                        {results.length === 0 ? (
                          <p className="p-3 text-sm text-muted-foreground">No matches in the demo universe ({search}).</p>
                        ) : (
                          results.map((q) => (
                            <button
                              key={q.ticker}
                              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted"
                              onClick={() => { setTicker(q.ticker); setSearch('') }}
                            >
                              <span className="w-14 rounded bg-muted px-1.5 py-0.5 text-center text-xs font-bold">{q.ticker}</span>
                              <span className="flex-1 truncate text-sm">{q.name}</span>
                              <Money value={q.price} className="text-sm tnum" />
                            </button>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="shares">Shares</Label>
                <Input id="shares" type="number" min="0" step="any" value={shares} onChange={(e) => setShares(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cost-basis">Cost basis / share ($)</Label>
                <Input id="cost-basis" type="number" min="0" step="0.01" value={costBasis} onChange={(e) => setCostBasis(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            {investmentAccounts.length > 0 && (
              <div className="space-y-1.5">
                <Label>Linked account</Label>
                <Select value={accountId || 'none'} onValueChange={(v) => setAccountId(v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {investmentAccounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full" disabled={!ticker || !(Number(shares) > 0) || createHolding.isPending} onClick={addHolding}>
              Add holding
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) resetImport() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Import holdings from CSV</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {importRows.length === 0 ? (
              <div
                role="button" tabIndex={0}
                aria-label="Upload a CSV file"
                onClick={() => importInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && importInputRef.current?.click()}
                className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors hover:border-primary/60 hover:bg-muted/40"
              >
                <FileUp className="h-8 w-8 text-primary" />
                <p className="mt-2 text-sm font-medium">Click to choose a CSV</p>
                <p className="mt-1 text-xs text-muted-foreground">Columns: Ticker, Shares, Cost Basis (optional)</p>
                <input
                  ref={importInputRef} type="file" accept=".csv,text/csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) parseHoldingsFile(f) }}
                  aria-label="Choose CSV file"
                />
                <Button variant="ghost" size="sm" className="mt-2" onClick={(e) => { e.stopPropagation(); useSampleHoldings() }}>
                  Try a sample CSV
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{importFileName}</span>
                  <span>{validImportRows.length} of {importRows.length} rows valid</span>
                </div>
                <div className="max-h-56 overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Ticker</TableHead><TableHead className="text-right">Shares</TableHead><TableHead className="text-right">Cost basis</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {importRows.map((r, i) => (
                        <TableRow key={i} className={cn(!r.valid && 'bg-destructive/5')}>
                          <TableCell className="text-sm">{r.ticker || '—'}</TableCell>
                          <TableCell className="text-right text-sm tnum">{Number.isFinite(r.shares) ? r.shares : '—'}</TableCell>
                          <TableCell className="text-right text-sm tnum">{r.costBasis != null ? formatCurrency(r.costBasis) : '—'}</TableCell>
                          <TableCell className="text-xs">{r.valid ? <span className="text-success">Ready</span> : <span className="text-destructive">Invalid</span>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {investmentAccounts.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Linked account (applies to all rows)</Label>
                    <Select value={importAccountId || 'none'} onValueChange={(v) => setImportAccountId(v === 'none' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {investmentAccounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={resetImport}>Choose a different file</Button>
                  <Button className="flex-1" disabled={validImportRows.length === 0 || importHoldings.isPending} onClick={doImportHoldings}>
                    Import {validImportRows.length} holding{validImportRows.length === 1 ? '' : 's'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
