import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { saveImportMappingSchema } from '@/lib/validation/importMapping'

// R2.2: GET ?institution=X returns the caller's saved column mapping for
// that institution (or null), so re-imports from the same bank are one
// click instead of re-mapping columns every time.
export const GET = withAuthErrorHandling(async (req: Request) => {
  const { userId } = await getRequiredSession()
  const institution = new URL(req.url).searchParams.get('institution')
  if (!institution) return NextResponse.json({ error: 'institution query param required' }, { status: 400 })

  const row = await db.importMapping.findUnique({ where: { userId_institution: { userId, institution } } })
  return NextResponse.json(row ? { institution: row.institution, mapping: row.mapping } : null)
})

export const POST = withAuthErrorHandling(async (req: Request) => {
  const { userId } = await getRequiredSession()
  const parsed = saveImportMappingSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { institution, mapping } = parsed.data

  const row = await db.importMapping.upsert({
    where: { userId_institution: { userId, institution } },
    create: { userId, institution, mapping },
    update: { mapping },
  })
  return NextResponse.json({ institution: row.institution, mapping: row.mapping })
})
