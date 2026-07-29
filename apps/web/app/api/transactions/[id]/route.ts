import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { assertAccountOwned, assertCategoryOwned } from '@/lib/assertOwned'
import { updateTransactionSchema } from '@/lib/validation/transactions'

export const PATCH = withAuthErrorHandling(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const parsed = updateTransactionSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const existing = await db.transaction.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (parsed.data.accountId && !(await assertAccountOwned(parsed.data.accountId, userId))) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }
  if (parsed.data.categoryId && !(await assertCategoryOwned(parsed.data.categoryId, userId))) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }
  const { date, ...rest } = parsed.data
  const row = await db.transaction.update({ where: { id }, data: { ...rest, ...(date ? { date: new Date(date) } : {}) } })
  return NextResponse.json({ id: row.id })
})

export const DELETE = withAuthErrorHandling(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const existing = await db.transaction.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.transaction.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
