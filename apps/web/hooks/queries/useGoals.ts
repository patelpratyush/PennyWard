'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJSON } from '@/lib/fetchJSON'
import type { Goal } from '@/types'

// accountId is `string | null` here (not just `string | undefined` like the
// display-facing Goal type) so callers can explicitly unlink an account —
// `undefined` in a PATCH body means "don't touch this field", `null` means
// "clear it", and JSON.stringify would otherwise drop `undefined` silently.
type SaveGoalInput = Omit<Goal, 'id' | 'contributions' | 'accountId'> & { accountId?: string | null }
type UpdateGoalInput = Partial<SaveGoalInput>

export function useGoals() {
  return useQuery({ queryKey: ['goals'], queryFn: () => fetchJSON<Goal[]>('/api/goals') })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveGoalInput) => fetchJSON<Goal>('/api/goals', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateGoalInput }) =>
      fetchJSON(`/api/goals/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fetchJSON(`/api/goals/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useAddContribution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ goalId, amount, note }: { goalId: string; amount: number; note?: string }) =>
      fetchJSON(`/api/goals/${goalId}/contributions`, { method: 'POST', body: JSON.stringify({ amount, note }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}
