'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJSON } from '@/lib/fetchJSON'

export interface Holding {
  id: string
  ticker: string
  shares: number
  costBasis?: number
  accountId?: string
  createdAt: string
}

type SaveHoldingInput = {
  ticker: string
  shares: number
  costBasis?: number
  accountId?: string | null
}
type UpdateHoldingInput = Partial<SaveHoldingInput>

export function useHoldings() {
  return useQuery({ queryKey: ['holdings'], queryFn: () => fetchJSON<Holding[]>('/api/holdings') })
}

export function useCreateHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveHoldingInput) => fetchJSON<Holding>('/api/holdings', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holdings'] }),
  })
}

export function useUpdateHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateHoldingInput }) =>
      fetchJSON(`/api/holdings/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holdings'] }),
  })
}

export function useDeleteHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fetchJSON(`/api/holdings/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holdings'] }),
  })
}

export function useImportHoldings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { accountId?: string | null; rows: { ticker: string; shares: number; costBasis?: number }[] }) =>
      fetchJSON<{ imported: number }>('/api/holdings/import', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holdings'] }),
  })
}
