'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJSON } from '@/lib/fetchJSON'
import type { Cadence } from '@/lib/finance/recurring'

export interface RecurringSeriesDTO {
  payeeNorm: string
  displayName: string
  type: 'income' | 'expense'
  cadence: Cadence
  avgAmount: number
  lastAmount: number
  previousAmount: number | null
  priceIncreased: boolean
  lastDate: string
  nextExpected: string
  occurrences: number
  confirmed: boolean
}

export function useRecurring() {
  return useQuery({ queryKey: ['recurring'], queryFn: () => fetchJSON<RecurringSeriesDTO[]>('/api/recurring') })
}

export function useRecurringAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { payeeNorm: string; cadence: Cadence; action: 'confirm' | 'dismiss' }) =>
      fetchJSON('/api/recurring', { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  })
}
