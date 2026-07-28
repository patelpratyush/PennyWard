import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { savePayoffScenarioSchema } from '@/lib/validation/debts'

const updatePayoffScenarioSchema = savePayoffScenarioSchema.partial()

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const parsed = updatePayoffScenarioSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const existing = await db.payoffScenario.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const row = await db.payoffScenario.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ id: row.id })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const existing = await db.payoffScenario.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.payoffScenario.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
