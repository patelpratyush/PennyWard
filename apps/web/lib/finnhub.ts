import { Redis } from '@upstash/redis'
import { round2 } from './format'
import type { StockQuote } from '@/services/stocks'

const CACHE_TTL_SECONDS = 15 * 60 // R6.2: 15-minute server cache per ticker

const redis = Redis.fromEnv({ retry: false })

export function finnhubConfigured(): boolean {
  return !!process.env.FINNHUB_API_KEY
}

interface FinnhubQuoteResponse {
  c: number // current price
  d: number // change
  dp: number // percent change
  h: number // day high
  l: number // day low
  o: number // open
  pc: number // previous close
}

interface FinnhubProfileResponse {
  name?: string
  exchange?: string
  finnhubIndustry?: string
  marketCapitalization?: number // in millions
}

/**
 * Fetches a real quote from Finnhub's free-tier /quote + /stock/profile2
 * endpoints, caching the combined result in Redis for 15 minutes (the free
 * tier's 60 calls/min cap makes this required, not optional). Returns null
 * when FINNHUB_API_KEY isn't set, the ticker isn't found, or the API call
 * fails — callers should fall back to services/stocks.ts's mock in that case.
 *
 * Note: Finnhub's free tier does not include historical candles (that
 * endpoint requires a paid plan), so getHistory() in services/stocks.ts
 * stays mock-only — there's no free real data source to swap it for.
 */
export async function getFinnhubQuote(ticker: string): Promise<StockQuote | null> {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) return null

  const cacheKey = `finnhub:quote:${ticker.toUpperCase()}`
  const cached = await redis.get<StockQuote>(cacheKey).catch(() => null)
  if (cached) return cached

  try {
    const [quoteRes, profileRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`),
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${apiKey}`),
    ])
    if (!quoteRes.ok) return null
    const q = (await quoteRes.json()) as FinnhubQuoteResponse
    if (!q.c) return null // c === 0 means Finnhub has no data for this symbol
    const profile = quoteRes.ok && profileRes.ok ? ((await profileRes.json()) as FinnhubProfileResponse) : {}

    const result: StockQuote = {
      ticker: ticker.toUpperCase(),
      name: profile.name ?? ticker.toUpperCase(),
      price: round2(q.c),
      change: round2(q.d),
      changePct: round2(q.dp),
      open: round2(q.o),
      previousClose: round2(q.pc),
      dayLow: round2(q.l),
      dayHigh: round2(q.h),
      // Not available on the free /quote+/profile2 endpoints without the
      // paid candles API — approximated from the day range until then.
      week52Low: round2(q.l * 0.85),
      week52High: round2(q.h * 1.15),
      volume: 0,
      avgVolume: 0,
      marketCap: Math.floor((profile.marketCapitalization ?? 0) * 1e6),
      exchange: profile.exchange ?? '',
      sector: profile.finnhubIndustry ?? '',
      industry: profile.finnhubIndustry ?? '',
      description: '',
    }
    await redis.set(cacheKey, result, { ex: CACHE_TTL_SECONDS }).catch(() => {})
    return result
  } catch {
    return null
  }
}
