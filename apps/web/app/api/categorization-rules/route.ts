import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { createRuleSchema } from '@/lib/validation/rules'

export async function GET() {
  const { userId } = await getRequiredSession()
  const rows = await db.categorizationRule.findMany({ where: { userId }, orderBy: { priority: 'desc' } })
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const { userId } = await getRequiredSession()
  const parsed = createRuleSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const row = await db.categorizationRule.create({ data: { ...parsed.data, userId } })
  return NextResponse.json(row, { status: 201 })
}
