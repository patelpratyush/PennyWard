import { z } from 'zod'

export const createRuleSchema = z.object({
  matchType: z.enum(['contains', 'equals', 'regex']),
  pattern: z.string().min(1).max(300),
  categoryId: z.string().min(1),
  priority: z.number().int().default(0),
})

export const updateRuleSchema = createRuleSchema.partial()
