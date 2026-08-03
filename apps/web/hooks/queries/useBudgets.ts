'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJSON } from '@/lib/fetchJSON'
import type { Budget } from '@/types'

type UpsertBudgetInput = {
  month: string
  entries: { categoryId: string; budgeted: number; rollover: boolean }[]
  expectedIncome: number
  savingsTarget: number
  /** Only takes effect when creating a new month's budget — shares it with the caller's household. */
  shared?: boolean
}

export function useBudget(month: string) {
  return useQuery({
    queryKey: ['budget', month],
    queryFn: () => fetchJSON<Budget | null>(`/api/budgets?month=${month}`),
  })
}

export function useUpsertBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertBudgetInput) =>
      fetchJSON<{ id: string }>('/api/budgets', { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ['budget', variables.month] }),
  })
}
