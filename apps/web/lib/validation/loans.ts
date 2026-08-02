import { z } from 'zod'

export const saveLoanScenarioSchema = z.object({
  name: z.string().min(1).max(200),
  preferred: z.boolean().default(false),
  kind: z.enum(['car', 'general']),
  vehiclePrice: z.number().min(0).default(0),
  downPayment: z.number().min(0).default(0),
  tradeInValue: z.number().min(0).default(0),
  tradeInOwed: z.number().min(0).default(0),
  rebate: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(100).default(0),
  docFee: z.number().min(0).default(0),
  registrationFee: z.number().min(0).default(0),
  destinationFee: z.number().min(0).default(0),
  dealerFees: z.number().min(0).default(0),
  loanAmount: z.number().min(0).default(0),
  apr: z.number().min(0).max(100),
  termMonths: z.number().int().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  extraMonthly: z.number().min(0).default(0),
  oneTimePayment: z.number().min(0).default(0),
})

export const updateLoanScenarioSchema = saveLoanScenarioSchema.partial()
