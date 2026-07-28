import { z } from 'zod'

export const createTransactionSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().optional(),
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number(),
  merchant: z.string().min(1).max(300),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string()).default([]),
  recurring: z.boolean().default(false),
  cleared: z.boolean().default(true),
})

export const updateTransactionSchema = createTransactionSchema.partial()

export const listQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
})
