import { NextResponse } from 'next/server'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { finnhubConfigured, getFinnhubQuote } from '@/lib/finnhub'
import type { StockQuote } from '@/services/stocks'

/**
 * R6.2/R6.5/R6.6: real quotes when FINNHUB_API_KEY is set, cached 15 min
 * per ticker. `configured: false` tells callers to keep using the
 * deterministic mock in services/stocks.ts instead — this route never
 * silently returns fake data as if it were real.
 */
export const GET = withAuthErrorHandling(async (req: Request) => {
  await getRequiredSession()
  if (!finnhubConfigured()) return NextResponse.json({ configured: false, quotes: {} })

  const tickers = (new URL(req.url).searchParams.get('tickers') ?? '').split(',').map((t) => t.trim()).filter(Boolean)
  if (tickers.length === 0) return NextResponse.json({ configured: true, quotes: {} })

  const results = await Promise.all(tickers.map((t) => getFinnhubQuote(t)))
  const quotes: Record<string, StockQuote> = {}
  tickers.forEach((t, i) => { if (results[i]) quotes[t.toUpperCase()] = results[i]! })
  return NextResponse.json({ configured: true, quotes })
})
