import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { createAccountSchema } from '@/lib/validation/accounts'
import { round2 } from '@/lib/format'

function toDTO(row: Awaited<ReturnType<typeof db.financialAccount.findFirstOrThrow>>) {
  return {
    id: row.id,
    name: row.name,
    institution: row.institution,
    type: row.type,
    balance: round2(Number(row.balance)),
    includeInNetWorth: row.includeInNetWorth,
    archived: row.archived,
    lastUpdated: row.lastUpdated.toISOString().slice(0, 10),
    creditLimit: row.creditLimit != null ? round2(Number(row.creditLimit)) : undefined,
    apr: row.apr != null ? round2(Number(row.apr)) : undefined,
    minimumPayment: row.minimumPayment != null ? round2(Number(row.minimumPayment)) : undefined,
    dueDay: row.dueDay ?? undefined,
    originalBalance: row.originalBalance != null ? round2(Number(row.originalBalance)) : undefined,
  }
}

export const GET = withAuthErrorHandling(async () => {
  const { userId } = await getRequiredSession()
  const rows = await db.financialAccount.findMany({ where: { userId }, orderBy: { lastUpdated: 'asc' } })
  return NextResponse.json(rows.map(toDTO))
})

export const POST = withAuthErrorHandling(async (req: Request) => {
  const { userId } = await getRequiredSession()
  const parsed = createAccountSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const row = await db.financialAccount.create({ data: { ...parsed.data, userId } })
  return NextResponse.json(toDTO(row), { status: 201 })
})
