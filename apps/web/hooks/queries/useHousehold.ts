'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJSON } from '@/lib/fetchJSON'

export interface HouseholdMember {
  userId: string
  name: string | null
  email: string | null
  role: 'owner' | 'member'
  joinedAt: string
}

export interface Household {
  id: string
  name: string
  ownerId: string
  role: 'owner' | 'member'
  members: HouseholdMember[]
}

export function useHousehold() {
  return useQuery({ queryKey: ['household'], queryFn: () => fetchJSON<Household | null>('/api/household') })
}

export function useCreateHousehold() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => fetchJSON<{ id: string; name: string }>('/api/household', { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['household'] }),
  })
}

export function useCreateInvite() {
  return useMutation({
    mutationFn: (email: string) =>
      fetchJSON<{ id: string; token: string; email: string; expiresAt: string }>('/api/household/invites', { method: 'POST', body: JSON.stringify({ email }) }),
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => fetchJSON(`/api/household/members/${userId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['household'] }),
  })
}

export function useAcceptInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => fetchJSON<{ householdId: string }>(`/api/household/invites/${token}`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['household'] }),
  })
}
