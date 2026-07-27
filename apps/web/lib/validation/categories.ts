import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  group: z.string().min(1).max(100),
  icon: z.string().min(1),
  color: z.string().min(1),
  kind: z.enum(['expense', 'income', 'transfer']).default('expense'),
  parentId: z.string().optional(),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  archived: z.boolean().optional(),
})
