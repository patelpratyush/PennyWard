import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { updateRuleSchema } from '@/lib/validation/rules'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const parsed = updateRuleSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const existing = await db.categorizationRule.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const row = await db.categorizationRule.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ id: row.id })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const existing = await db.categorizationRule.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.categorizationRule.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
