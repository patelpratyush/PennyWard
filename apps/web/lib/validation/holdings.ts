import { z } from 'zod'

export const createHoldingSchema = z.object({
  ticker: z.string().min(1).max(10).transform((v) => v.toUpperCase()),
  shares: z.number().positive(),
  costBasis: z.number().min(0).optional(),
  accountId: z.string().nullable().optional(),
})

export const updateHoldingSchema = createHoldingSchema.partial()
