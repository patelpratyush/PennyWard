'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJSON } from '@/lib/fetchJSON'
import type { LoanScenario } from '@/types'

type SaveLoanScenarioInput = Omit<LoanScenario, 'id' | 'createdAt'>
type UpdateLoanScenarioInput = Partial<SaveLoanScenarioInput>

export function useLoanScenarios() {
  return useQuery({ queryKey: ['loan-scenarios'], queryFn: () => fetchJSON<LoanScenario[]>('/api/scenarios/loan') })
}

export function useSaveLoanScenario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveLoanScenarioInput) =>
      fetchJSON<LoanScenario>('/api/scenarios/loan', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loan-scenarios'] }),
  })
}

export function useUpdateLoanScenario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateLoanScenarioInput }) =>
      fetchJSON(`/api/scenarios/loan/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loan-scenarios'] }),
  })
}

export function useDeleteLoanScenario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fetchJSON(`/api/scenarios/loan/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loan-scenarios'] }),
  })
}
