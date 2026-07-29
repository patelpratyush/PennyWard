import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { assertAccountOwned } from '@/lib/assertOwned'
import { updateDebtSchema } from '@/lib/validation/debts'

export const PATCH = withAuthErrorHandling(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const parsed = updateDebtSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const existing = await db.debt.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (parsed.data.accountId && !(await assertAccountOwned(parsed.data.accountId, userId))) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }
  const row = await db.debt.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ id: row.id })
})

export const DELETE = withAuthErrorHandling(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const existing = await db.debt.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.debt.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
