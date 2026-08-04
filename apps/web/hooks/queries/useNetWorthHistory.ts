'use client'
import { useQuery } from '@tanstack/react-query'
import { fetchJSON } from '@/lib/fetchJSON'

export interface NetWorthPoint {
  date: string
  assets: number
  liabilities: number
  netWorth: number
}

export function useNetWorthHistory(params?: { from?: string; to?: string }) {
  const qs = new URLSearchParams()
  if (params?.from) qs.set('from', params.from)
  if (params?.to) qs.set('to', params.to)
  const query = qs.toString()
  return useQuery({
    queryKey: ['networth-history', params?.from, params?.to],
    queryFn: () => fetchJSON<NetWorthPoint[]>(`/api/networth/history${query ? `?${query}` : ''}`),
  })
}
