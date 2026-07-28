import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { savePayoffScenarioSchema } from '@/lib/validation/debts'
import { round2 } from '@/lib/format'

function toDTO(row: Awaited<ReturnType<typeof db.payoffScenario.findFirstOrThrow>>) {
  return {
    id: row.id, name: row.name, strategy: row.strategy,
    extraMonthly: round2(Number(row.extraMonthly)), oneTimePayment: round2(Number(row.oneTimePayment)),
    startMonth: row.startMonth, customOrder: row.customOrder,
  }
}

export async function GET() {
  const { userId } = await getRequiredSession()
  const rows = await db.payoffScenario.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json(rows.map(toDTO))
}

export async function POST(req: Request) {
  const { userId } = await getRequiredSession()
  const parsed = savePayoffScenarioSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const row = await db.payoffScenario.create({ data: { ...parsed.data, userId } })
  return NextResponse.json(toDTO(row), { status: 201 })
}
