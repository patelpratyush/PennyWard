import { z } from 'zod'

export const createDebtSchema = z.object({
  name: z.string().min(1).max(200),
  lender: z.string().min(1).max(200),
  type: z.enum(['credit_card', 'auto_loan', 'student_loan', 'personal_loan', 'mortgage', 'medical', 'bnpl', 'other']),
  balance: z.number().min(0),
  originalBalance: z.number().min(0),
  apr: z.number().min(0).max(100),
  minimumPayment: z.number().min(0),
  dueDay: z.number().int().min(1).max(31),
  creditLimit: z.number().min(0).optional(),
  accountId: z.string().optional(),
})
export const updateDebtSchema = createDebtSchema.partial()

export const savePayoffScenarioSchema = z.object({
  name: z.string().min(1).max(200),
  strategy: z.enum(['minimum', 'snowball', 'avalanche', 'custom']),
  extraMonthly: z.number().min(0),
  oneTimePayment: z.number().min(0),
  startMonth: z.string().regex(/^\d{4}-\d{2}$/),
  customOrder: z.array(z.string()).default([]),
})
