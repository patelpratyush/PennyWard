import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'

const schema = z.object({ ids: z.array(z.string()).min(1).max(500) })

export const POST = withAuthErrorHandling(async (req: Request) => {
  const { userId } = await getRequiredSession()
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { count } = await db.transaction.deleteMany({ where: { id: { in: parsed.data.ids }, userId } })
  return NextResponse.json({ deleted: count })
})
