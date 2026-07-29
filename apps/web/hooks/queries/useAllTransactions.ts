'use client'
import { useQuery } from '@tanstack/react-query'
import { fetchJSON } from '@/lib/fetchJSON'
import type { Transaction } from '@/types'
import type { TransactionFilters } from './useTransactions'

// The API caps pageSize at 200 (see lib/validation/transactions.ts), so any
// caller that needs the COMPLETE set of matching transactions for an
// aggregate calculation (budget totals, category breakdowns, net-worth
// trends, etc.) cannot just fetch one page — a user with more than 200
// matching transactions would silently get an understated result. This hook
// pages through the API internally and returns the full accumulated array.
//
// Safety cap: stop after MAX_PAGES pages (MAX_PAGES * PAGE_SIZE transactions)
// even if the server claims more remain, to avoid a pathological runaway
// fetch loop. If the cap is hit, we still return what was fetched — a
// (rare) truncation is better than an infinite loop — but this is a much
// higher ceiling than the previous silent 200-row limit.
const PAGE_SIZE = 200
const MAX_PAGES = 20 // 20 * 200 = 4000 transactions safety ceiling

function toSearchParams(filters: TransactionFilters): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value != null && value !== '') params.set(key, String(value))
  }
  return params.toString()
}

async function fetchAllTransactions(filters: Omit<TransactionFilters, 'page' | 'pageSize'>): Promise<Transaction[]> {
  const items: Transaction[] = []
  let page = 1
  let total = Infinity
  while (items.length < total && page <= MAX_PAGES) {
    const qs = toSearchParams({ ...filters, page, pageSize: PAGE_SIZE })
    const res = await fetchJSON<{ items: Transaction[]; total: number }>(`/api/transactions?${qs}`)
    items.push(...res.items)
    total = res.total
    if (res.items.length === 0) break // guard against an infinite loop on a stalled/broken API response
    page += 1
  }
  return items
}

export function useAllTransactions(filters: Omit<TransactionFilters, 'page' | 'pageSize'> = {}) {
  const query = useQuery({
    queryKey: ['transactions', 'all', filters],
    queryFn: () => fetchAllTransactions(filters),
  })
  // Shaped like useTransactions' `{ data: { items, total } }` callers expect,
  // but data is the full accumulated array rather than a single page.
  return { data: query.data, isLoading: query.isLoading } as const
}
