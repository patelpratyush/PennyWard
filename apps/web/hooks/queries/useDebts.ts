'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJSON } from '@/lib/fetchJSON'
import type { Debt, PayoffStrategy } from '@/types'

type CreateDebtInput = Omit<Debt, 'id'>

export interface LumpSum {
  month: number
  amount: number
  debtId?: string
}

export type PayoffScenario = {
  id: string
  name: string
  strategy: PayoffStrategy
  extraMonthly: number
  oneTimePayment: number
  startMonth: string
  customOrder: string[]
  lumpSums: LumpSum[]
}

type SavePayoffScenarioInput = {
  name: string
  strategy: PayoffStrategy
  extraMonthly: number
  oneTimePayment: number
  startMonth: string
  customOrder?: string[]
  lumpSums?: LumpSum[]
}

export function useDebts() {
  return useQuery({ queryKey: ['debts'], queryFn: () => fetchJSON<Debt[]>('/api/debts') })
}

export function useCreateDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDebtInput) =>
      fetchJSON<Debt>('/api/debts', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  })
}

export function useUpdateDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Debt> }) =>
      fetchJSON(`/api/debts/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  })
}

export function useDeleteDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fetchJSON(`/api/debts/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  })
}

export function usePayoffScenarios() {
  return useQuery({ queryKey: ['payoff-scenarios'], queryFn: () => fetchJSON<PayoffScenario[]>('/api/scenarios/payoff') })
}

export function useSavePayoffScenario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SavePayoffScenarioInput) =>
      fetchJSON<PayoffScenario>('/api/scenarios/payoff', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payoff-scenarios'] }),
  })
}

export function useDeletePayoffScenario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fetchJSON(`/api/scenarios/payoff/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payoff-scenarios'] }),
  })
}
