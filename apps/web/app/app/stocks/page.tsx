'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Info, Plus, Search, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/stores/useStore'
import { useMe } from '@/hooks/queries/useMe'
import { PageHeader } from '@/components/shared/Misc'
import { EmptyState } from '@/components/shared/States'
import { Money } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getQuote, searchStocks } from '@/services/stocks'
import { cn } from '@/lib/utils'

export default function Stocks() {
  const router = useRouter()
  const { watchlists, addWatchlist, deleteWatchlist, addToWatchlist, removeFromWatchlist } = useStore()
  const [activeId, setActiveId] = useState(watchlists[0]?.id ?? '')
  const [addOpen, setAddOpen] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [search, setSearch] = useState('')

  // Watchlists have no backend (still local to this browser via useStore) —
  // this caps the count client-side, matching the pricing page. Not a
  // security boundary, since there's no server resource to guard.
  const { data: me } = useMe()
  // `??` also converts a real `null` (the wire form of PLAN_LIMITS' Infinity) to Infinity here, not just a missing `me`.
  const watchlistLimit = me?.limits.maxWatchlists ?? Infinity
  const atWatchlistLimit = watchlists.length >= watchlistLimit
  const openNewWatchlist = () => {
    if (atWatchlistLimit) { router.push('/pricing'); return }
    setAddOpen(true)
  }

  const active = watchlists.find((w) => w.id === activeId) ?? watchlists[0]
  const quotes = useMemo(
    () => (active?.items ?? []).map((i) => ({ item: i, quote: getQuote(i.ticker) })).filter((x) => x.quote),
    [active])
  const results = useMemo(() => searchStocks(search), [search])

  return (
    <div>
      <PageHeader
        title="Stocks"
        description="Informational watchlists — follow companies you care about, without the noise."
        actions={
          <>
            <Button variant="outline" onClick={openNewWatchlist}>
              <Plus className="mr-1.5 h-4 w-4" />{atWatchlistLimit ? 'Upgrade for more lists' : 'New watchlist'}
            </Button>
          </>
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-lg bg-info-muted px-3 py-2 text-xs text-info">
        <Info className="h-4 w-4 shrink-0" />
        Stock information is for educational purposes only and is not financial advice. Prices are simulated demo data, not live market data.
      </div>

      {watchlists.length === 0 ? (
        <EmptyState
          title="No watchlists yet"
          description="Create a watchlist to follow companies you care about — no trading required."
          actionLabel="Create watchlist"
          onAction={() => setAddOpen(true)}
        />
      ) : (
        <>
          <Tabs value={active?.id ?? ''} onValueChange={setActiveId}>
            <TabsList>
              {watchlists.map((w) => <TabsTrigger key={w.id} value={w.id}>{w.name}</TabsTrigger>)}
            </TabsList>
          </Tabs>

          {/* Search to add */}
          <div className="relative mt-4 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies or tickers to add…" className="pl-9" aria-label="Search stocks"
            />
            {search && (
              <Card className="absolute inset-x-0 top-11 z-20 shadow-lift">
                <CardContent className="p-1">
                  {results.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">No matches in the demo universe ({search}).</p>
                  ) : (
                    results.map((q) => {
                      const already = active?.items.some((i) => i.ticker === q.ticker)
                      return (
                        <button
                          key={q.ticker}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted disabled:opacity-50"
                          disabled={already}
                          onClick={() => {
                            if (active) {
                              addToWatchlist(active.id, q.ticker, q.price)
                              toast.success(`${q.ticker} added to ${active.name}.`)
                            }
                            setSearch('')
                          }}
                        >
                          <span className="w-14 rounded bg-muted px-1.5 py-0.5 text-center text-xs font-bold">{q.ticker}</span>
                          <span className="flex-1 truncate text-sm">{q.name}</span>
                          <Money value={q.price} className="text-sm tnum" />
                          {already ? <span className="text-xs text-muted-foreground">Added</span> : <Plus className="h-4 w-4 text-primary" />}
                        </button>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Watchlist cards */}
          {quotes.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="This watchlist is empty" description="Search above to add your first company." />
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {quotes.map(({ item, quote }, idx) => quote && (
                <motion.div key={item.ticker} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                  <Card className="group shadow-card transition-shadow hover:shadow-lift">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <Link href={`/app/stocks/${quote.ticker}`} className="flex items-center gap-3">
                          <span className="flex h-10 w-14 items-center justify-center rounded-xl bg-muted text-sm font-bold">{quote.ticker}</span>
                          <span>
                            <span className="block max-w-36 truncate text-sm font-semibold group-hover:underline">{quote.name}</span>
                            <span className="text-xs text-muted-foreground">{quote.exchange} · {quote.sector}</span>
                          </span>
                        </Link>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label={`Remove ${quote.ticker}`}
                          onClick={() => { if (active) { removeFromWatchlist(active.id, item.ticker); toast.success(`${item.ticker} removed.`) } }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                      <Link href={`/app/stocks/${quote.ticker}`} className="mt-3 flex items-end justify-between">
                        <div>
                          <Money value={quote.price} className="text-2xl font-bold" />
                          <p className={cn('mt-0.5 flex items-center gap-1 text-sm font-medium tnum', quote.changePct >= 0 ? 'text-success' : 'text-destructive')}>
                            {quote.changePct >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            {quote.changePct >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePct >= 0 ? '+' : ''}{quote.changePct.toFixed(2)}%)
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground tnum">
                          <p>Added {item.addedAt}</p>
                          <p>at ${item.addedPrice.toFixed(2)}</p>
                          <p className={cn('font-semibold', quote.price >= item.addedPrice ? 'text-success' : 'text-destructive')}>
                            {quote.price >= item.addedPrice ? '+' : ''}{(((quote.price - item.addedPrice) / item.addedPrice) * 100).toFixed(1)}% since
                          </p>
                        </div>
                      </Link>
                      {item.note && <p className="mt-2 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">{item.note}</p>}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {watchlists.length > 1 && active && (
            <Button variant="ghost" size="sm" className="mt-4 text-muted-foreground" onClick={() => {
              deleteWatchlist(active.id)
              setActiveId(watchlists.find((w) => w.id !== active.id)?.id ?? '')
              toast.success('Watchlist deleted.')
            }}>
              <Trash2 className="mr-1.5 h-4 w-4" />Delete “{active.name}”
            </Button>
          )}
        </>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New watchlist</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="e.g. Dividend ideas" aria-label="Watchlist name" />
            <Button className="w-full" disabled={newListName.trim().length < 2} onClick={() => {
              addWatchlist(newListName.trim())
              toast.success('Watchlist created.')
              setAddOpen(false)
              setNewListName('')
            }}>Create watchlist</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
