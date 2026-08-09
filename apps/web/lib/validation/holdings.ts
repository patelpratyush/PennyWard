import { z } from 'zod'

export const createHoldingSchema = z.object({
  ticker: z.string().min(1).max(10).transform((v) => v.toUpperCase()),
  shares: z.number().positive(),
  costBasis: z.number().min(0).optional(),
  accountId: z.string().nullable().optional(),
})

export const updateHoldingSchema = createHoldingSchema.partial()

// R6.1: bulk CSV import.
export const importHoldingsSchema = z.object({
  accountId: z.string().nullable().optional(),
  rows: z.array(z.object({
    ticker: z.string().min(1).max(10).transform((v) => v.toUpperCase()),
    shares: z.number().positive(),
    costBasis: z.number().min(0).optional(),
  })).min(1).max(500),
})
