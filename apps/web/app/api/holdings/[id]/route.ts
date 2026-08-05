import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { assertAccountOwned } from '@/lib/assertOwned'
import { updateHoldingSchema } from '@/lib/validation/holdings'

export const PATCH = withAuthErrorHandling(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const parsed = updateHoldingSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const existing = await db.holding.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { accountId } = parsed.data
  if (accountId != null && !(await assertAccountOwned(accountId, userId))) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  const row = await db.holding.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ id: row.id })
})

export const DELETE = withAuthErrorHandling(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const existing = await db.holding.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.holding.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
