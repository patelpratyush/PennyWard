import { z } from 'zod'

export const recurringActionSchema = z.object({
  payeeNorm: z.string().min(1),
  cadence: z.enum(['weekly', 'biweekly', 'monthly', 'annual']),
  action: z.enum(['confirm', 'dismiss']),
})
