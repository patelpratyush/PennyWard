import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { createDebtSchema } from '@/lib/validation/debts'
import { round2 } from '@/lib/format'

function toDTO(row: Awaited<ReturnType<typeof db.debt.findFirstOrThrow>>) {
  return {
    id: row.id, name: row.name, lender: row.lender, type: row.type,
    balance: round2(Number(row.balance)), originalBalance: round2(Number(row.originalBalance)),
    apr: round2(Number(row.apr)), minimumPayment: round2(Number(row.minimumPayment)), dueDay: row.dueDay,
    creditLimit: row.creditLimit != null ? round2(Number(row.creditLimit)) : undefined,
    accountId: row.accountId ?? undefined,
  }
}

export async function GET() {
  const { userId } = await getRequiredSession()
  const rows = await db.debt.findMany({ where: { userId }, orderBy: { id: 'asc' } })
  return NextResponse.json(rows.map(toDTO))
}

export async function POST(req: Request) {
  const { userId } = await getRequiredSession()
  const parsed = createDebtSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const row = await db.debt.create({ data: { ...parsed.data, userId } })
  return NextResponse.json(toDTO(row), { status: 201 })
}
