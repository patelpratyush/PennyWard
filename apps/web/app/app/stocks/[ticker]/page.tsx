'use client'
import { useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Info, ListPlus, StickyNote, TrendingDown, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/stores/useStore'
import { PageHeader } from '@/components/shared/Misc'
import { ErrorState } from '@/components/shared/States'
import { Money } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { getHistory, getQuote } from '@/services/stocks'
import { formatCurrency, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

const ranges = ['1D', '5D', '1M', '6M', '1Y', '5Y'] as const

export default function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>()
  const router = useRouter()
  const { watchlists, addToWatchlist, removeFromWatchlist, updateWatchlistNote } = useStore()
  const [range, setRange] = useState<(typeof ranges)[number]>('6M')
  const [targetList, setTargetList] = useState(watchlists[0]?.id ?? '')

  const quote = useMemo(() => (ticker ? getQuote(ticker) : null), [ticker])
  const history = useMemo(() => (ticker ? getHistory(ticker, range) : []), [ticker, range])

  const membership = useMemo(() => {
    for (const w of watchlists) {
      const item = w.items.find((i) => i.ticker === ticker?.toUpperCase())
      if (item) return { watchlist: w, item }
    }
    return null
  }, [watchlists, ticker])

  if (!quote) {
    return <ErrorState title="Ticker not found" description="This demo covers a fixed universe of large U.S. companies and index ETFs." onRetry={() => router.push('/app/stocks')} />
  }

  const up = quote.changePct >= 0
  const stats: [string, string][] = [
    ['Open', formatCurrency(quote.open)],
    ['Previous close', formatCurrency(quote.previousClose)],
    ['Day range', `${formatCurrency(quote.dayLow)} – ${formatCurrency(quote.dayHigh)}`],
    ['52-week range', `${formatCurrency(quote.week52Low)} – ${formatCurrency(quote.week52High)}`],
    ['Volume', formatNumber(quote.volume)],
    ['Avg. volume', formatNumber(quote.avgVolume)],
    ['Market cap', `$${(quote.marketCap / 1e9).toFixed(0)}B`],
    ['Exchange', quote.exchange],
    ['Sector', quote.sector],
    ['Industry', quote.industry],
  ]

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push('/app/stocks')}>
        <ArrowLeft className="mr-1 h-4 w-4" />Stocks
      </Button>

      <PageHeader
        title={`${quote.ticker} — ${quote.name}`}
        description={`${quote.exchange} · ${quote.sector} · Prices are simulated demo data`}
        actions={
          membership ? (
            <Button variant="outline" onClick={() => { removeFromWatchlist(membership.watchlist.id, quote.ticker); toast.success(`${quote.ticker} removed from ${membership.watchlist.name}.`) }}>
              Remove from {membership.watchlist.name}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Select value={targetList} onValueChange={setTargetList}>
                <SelectTrigger className="w-44" aria-label="Choose watchlist"><SelectValue placeholder="Watchlist" /></SelectTrigger>
                <SelectContent>
                  {watchlists.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={() => {
                if (targetList) {
                  addToWatchlist(targetList, quote.ticker, quote.price)
                  toast.success(`${quote.ticker} added to watchlist.`)
                }
              }}>
                <ListPlus className="mr-1.5 h-4 w-4" />Add to watchlist
              </Button>
            </div>
          )
        }
      />

      {/* Price hero */}
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-end gap-4">
            <Money value={quote.price} className="text-4xl font-extrabold" />
            <p className={cn('flex items-center gap-1.5 text-lg font-semibold tnum', up ? 'text-success' : 'text-destructive')}>
              {up ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {up ? '+' : ''}{quote.change.toFixed(2)} ({up ? '+' : ''}{quote.changePct.toFixed(2)}%) today
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Tabs value={range} onValueChange={(v) => setRange(v as typeof range)}>
              <TabsList>
                {ranges.map((r) => <TabsTrigger key={r} value={r}>{r}</TabsTrigger>)}
              </TabsList>
            </Tabs>
          </div>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="stockFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={up ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-5))'} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={up ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-5))'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => format(parseISO(v), range === '5Y' ? 'MMM yy' : 'MMM d')} minTickGap={40} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `$${v.toFixed(0)}`} width={46} />
                <RTooltip formatter={(v: number) => [formatCurrency(v), 'Price']} labelFormatter={(v) => format(parseISO(v as string), 'MMM d, yyyy')} />
                <Area type="monotone" dataKey="price" stroke={up ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-5))'} fill="url(#stockFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        {/* Stats */}
        <Card className="shadow-card lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Key statistics</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {stats.map(([l, v]) => (
                <div key={l}>
                  <p className="text-xs text-muted-foreground">{l}</p>
                  <p className="mt-0.5 font-medium tnum">{v}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* About + note */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">About</CardTitle></CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">{quote.description}</CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><StickyNote className="h-4 w-4" />Your note</CardTitle></CardHeader>
            <CardContent>
              {membership ? (
                <>
                  <Textarea
                    rows={3}
                    defaultValue={membership.item.note ?? ''}
                    placeholder="Why are you watching this one?"
                    aria-label="Watchlist note"
                    id="stock-note"
                  />
                  <Button size="sm" className="mt-2" onClick={() => {
                    const el = document.getElementById('stock-note') as HTMLTextAreaElement
                    updateWatchlistNote(membership.watchlist.id, quote.ticker, el.value)
                    toast.success('Note saved.')
                  }}>Save note</Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Add {quote.ticker} to a watchlist to keep a note about why you’re watching it.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-info-muted px-3 py-2 text-xs text-info">
        <Info className="h-4 w-4 shrink-0" />
        Educational information only — not investment advice. Demo prices are simulated and do not reflect real markets.
      </div>
    </div>
  )
}
