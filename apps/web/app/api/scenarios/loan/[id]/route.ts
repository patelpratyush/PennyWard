import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { updateLoanScenarioSchema } from '@/lib/validation/loans'

export const PATCH = withAuthErrorHandling(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const parsed = updateLoanScenarioSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const existing = await db.loanScenario.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { startDate, ...rest } = parsed.data
  const row = await db.loanScenario.update({
    where: { id },
    data: { ...rest, ...(startDate != null ? { startDate: new Date(startDate) } : {}) },
  })
  return NextResponse.json({ id: row.id })
})

export const DELETE = withAuthErrorHandling(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const existing = await db.loanScenario.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.loanScenario.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
