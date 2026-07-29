'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJSON } from '@/lib/fetchJSON'
import type { Category } from '@/types'

type CreateCategoryInput = Omit<Category, 'id' | 'archived'> & { archived?: boolean }

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
