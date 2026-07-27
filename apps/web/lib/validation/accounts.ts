import { z } from 'zod'

export const accountTypeSchema = z.enum([
  'checking', 'savings', 'cash', 'credit_card', 'auto_loan',
  'student_loan', 'mortgage', 'personal_loan', 'investment', 'other',
])

export const createAccountSchema = z.object({
  name: z.string().min(1).max(200),
  institution: z.string().max(200),
  type: accountTypeSchema,
  balance: z.number(),
  includeInNetWorth: z.boolean().default(true),
  archived: z.boolean().default(false),
  creditLimit: z.number().optional(),
  apr: z.number().min(0).max(100).optional(),
  minimumPayment: z.number().min(0).optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  originalBalance: z.number().optional(),
})

export const updateAccountSchema = createAccountSchema.partial()
