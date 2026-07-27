'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Category } from '@/types'

type CreateCategoryInput = Omit<Category, 'id' | 'archived'> & { archived?: boolean }

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Request failed: ${res.status}`)
  return res.json()
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => fetchJSON<Category[]>('/api/categories') })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCategoryInput) =>
      fetchJSON<{ id: string }>('/api/categories', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Category> }) =>
      fetchJSON(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}
