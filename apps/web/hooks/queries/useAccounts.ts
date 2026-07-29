'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJSON } from '@/lib/fetchJSON'
import type { Account } from '@/types'

type CreateAccountInput = Omit<Account, 'id' | 'lastUpdated'>

export function useAccounts() {
  return useQuery({ queryKey: ['accounts'], queryFn: () => fetchJSON<Account[]>('/api/accounts') })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAccountInput) =>
      fetchJSON<Account>('/api/accounts', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useUpdateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Account> }) =>
      fetchJSON(`/api/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fetchJSON(`/api/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}
