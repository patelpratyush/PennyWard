import { z } from 'zod'

export const upsertBudgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  entries: z.array(z.object({ categoryId: z.string(), budgeted: z.number().min(0), rollover: z.boolean().default(false) })),
  expectedIncome: z.number().min(0).default(0),
  savingsTarget: z.number().min(0).default(0),
  /** Only applies when creating a new month's budget — shares it with the caller's household, if any. */
  shared: z.boolean().default(false),
})
