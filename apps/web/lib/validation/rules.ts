import { z } from 'zod'

export const createRuleSchema = z.object({
  matchType: z.enum(['contains', 'equals', 'regex']),
  pattern: z.string().min(1).max(300),
  categoryId: z.string().min(1),
  priority: z.number().int().default(0),
}).superRefine((v, ctx) => {
  if (v.matchType !== 'regex') return
  try {
    new RegExp(v.pattern)
  } catch {
    ctx.addIssue({ code: 'custom', path: ['pattern'], message: 'Not a valid regular expression' })
  }
})

export const updateRuleSchema = z.object({
  matchType: z.enum(['contains', 'equals', 'regex']).optional(),
  pattern: z.string().min(1).max(300).optional(),
  categoryId: z.string().min(1).optional(),
  priority: z.number().int().optional(),
}).superRefine((v, ctx) => {
  if (v.matchType !== 'regex' || v.pattern == null) return
  try {
    new RegExp(v.pattern)
  } catch {
    ctx.addIssue({ code: 'custom', path: ['pattern'], message: 'Not a valid regular expression' })
  }
})
