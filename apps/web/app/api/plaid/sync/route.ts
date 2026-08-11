import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { db } from '@/lib/db'
import { syncPlaidItem } from '@/lib/plaidSync'

const schema = z.object({ itemId: z.string().min(1) })

/** R9.2: manual "refresh" button — runs the same incremental sync the
 * webhook triggers, on demand for one Item. */
export const POST = withAuthErrorHandling(async (req: Request) => {
  const { userId } = await getRequiredSession()
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const item = await db.plaidItem.findFirst({ where: { id: parsed.data.itemId, userId } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const result = await syncPlaidItem(item.id)
  return NextResponse.json(result)
})
