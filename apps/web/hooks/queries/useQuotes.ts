'use client'
import { useQuery } from '@tanstack/react-query'
import { fetchJSON } from '@/lib/fetchJSON'
import { getQuote as getMockQuote, type StockQuote } from '@/services/stocks'

interface QuotesResponse {
  configured: boolean
  quotes: Record<string, StockQuote>
}

/**
 * Fetches real quotes for the given tickers when FINNHUB_API_KEY is set
 * (server-cached 15 min), falling back per-ticker to the deterministic mock
 * in services/stocks.ts otherwise — so every call site keeps working
 * identically before a real key is ever provisioned.
 */
export function useQuotes(tickers: string[]) {
  const key = [...new Set(tickers.map((t) => t.toUpperCase()))].sort()
  const query = useQuery({
    queryKey: ['quotes', key],
    queryFn: () => fetchJSON<QuotesResponse>(`/api/quotes?tickers=${key.join(',')}`),
    enabled: key.length > 0,
    staleTime: 15 * 60 * 1000,
  })

  const resolve = (ticker: string): StockQuote | null =>
    query.data?.quotes[ticker.toUpperCase()] ?? getMockQuote(ticker)

  return { ...query, resolve }
}
