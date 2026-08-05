import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { assertAccountOwned } from '@/lib/assertOwned'
import { updateGoalSchema } from '@/lib/validation/goals'

export const PATCH = withAuthErrorHandling(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const parsed = updateGoalSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const existing = await db.goal.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { targetDate, accountId, ...rest } = parsed.data
  if (accountId != null && !(await assertAccountOwned(accountId, userId))) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  const row = await db.goal.update({
    where: { id },
    data: { ...rest, ...(accountId !== undefined ? { accountId } : {}), ...(targetDate != null ? { targetDate: new Date(targetDate) } : {}) },
  })
  return NextResponse.json({ id: row.id })
})

export const DELETE = withAuthErrorHandling(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const existing = await db.goal.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.goal.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
