'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJSON } from '@/lib/fetchJSON'

export type CategorizationRule = {
  id: string
  userId: string
  matchType: 'contains' | 'equals' | 'regex'
  pattern: string
  categoryId: string
  priority: number
}

type CreateCategorizationRuleInput = {
  matchType: 'contains' | 'equals' | 'regex'
  pattern: string
  categoryId: string
  priority?: number
}

export function useCategorizationRules() {
  return useQuery({
    queryKey: ['categorization-rules'],
    queryFn: () => fetchJSON<CategorizationRule[]>('/api/categorization-rules'),
  })
}

export function useCreateCategorizationRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCategorizationRuleInput) =>
      fetchJSON<{ id: string }>('/api/categorization-rules', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorization-rules'] }),
  })
}

export function useDeleteCategorizationRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fetchJSON(`/api/categorization-rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorization-rules'] }),
  })
}
