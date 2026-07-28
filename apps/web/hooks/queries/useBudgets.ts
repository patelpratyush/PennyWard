'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Budget } from '@/types'

type UpsertBudgetInput = {
  month: string
  entries: { categoryId: string; budgeted: number; rollover: boolean }[]
  expectedIncome: number
  savingsTarget: number
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Request failed: ${res.status}`)
  return res.json()
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
