import { z } from 'zod'

export const createHouseholdSchema = z.object({
  name: z.string().min(1).max(200),
})

export const createInviteSchema = z.object({
  email: z.email(),
})
