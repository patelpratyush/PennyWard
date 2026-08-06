import { z } from 'zod'

export const saveImportMappingSchema = z.object({
  institution: z.string().min(1).max(200),
  mapping: z.record(z.string(), z.string()),
})
