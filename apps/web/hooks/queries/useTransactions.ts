'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Transaction } from '@/types'

export interface TransactionFilters {
  from?: string
  to?: string
  categoryId?: string
  accountId?: string
  q?: string
  page?: number
  pageSize?: number
}

type CreateTransactionInput = Omit<Transaction, 'id' | 'createdAt'>

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Request failed: ${res.status}`)
  return res.json()
}

function toSearchParams(filters: TransactionFilters): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value != null && value !== '') params.set(key, String(value))
  }
  return params.toString()
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => fetchJSON<{ items: Transaction[]; total: number }>(`/api/transactions?${toSearchParams(filters)}`),
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTransactionInput) =>
      fetchJSON<Transaction>('/api/transactions', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Transaction> }) =>
      fetchJSON(`/api/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}

export function useBulkDeleteTransactions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) =>
      fetchJSON<{ deleted: number }>('/api/transactions/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}
