import { z } from 'zod'

export const createGoalSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['emergency', 'vacation', 'vehicle', 'home', 'education', 'wedding', 'purchase', 'custom']),
  targetAmount: z.number().min(0),
  currentAmount: z.number().min(0).default(0),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monthlyContribution: z.number().min(0).default(0),
  accountId: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['on_track', 'behind', 'completed', 'paused']).default('on_track'),
  notes: z.string().max(2000).optional(),
})

export const updateGoalSchema = createGoalSchema.partial()

export const createContributionSchema = z.object({
  amount: z.number().positive(),
  note: z.string().max(500).optional(),
})
