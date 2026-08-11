'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJSON } from '@/lib/fetchJSON'

export interface PlaidItemDTO {
  id: string
  institutionName: string | null
  status: 'active' | 'login_required' | 'error'
  createdAt: string
  accounts: { id: string; name: string }[]
}

export function usePlaidItems() {
  return useQuery({ queryKey: ['plaid-items'], queryFn: () => fetchJSON<PlaidItemDTO[]>('/api/plaid/items') })
}

export function useCreateLinkToken() {
  return useMutation({
    mutationFn: (itemId?: string) =>
      fetchJSON<{ linkToken: string }>('/api/plaid/link-token', { method: 'POST', body: JSON.stringify({ itemId }) }),
  })
}

export function useExchangePlaidToken() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { publicToken: string; institutionName?: string }) =>
      fetchJSON<{ itemId: string; accountsLinked: number; transactionsSynced: number }>('/api/plaid/exchange', {
        method: 'POST', body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plaid-items'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useSyncPlaidItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) =>
      fetchJSON<{ synced: number; removed?: number; loginRequired?: boolean }>('/api/plaid/sync', {
        method: 'POST', body: JSON.stringify({ itemId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plaid-items'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useUnlinkPlaidItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => fetchJSON(`/api/plaid/items/${itemId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plaid-items'] }),
  })
}
