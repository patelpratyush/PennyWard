import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { assertAccountOwned } from '@/lib/assertOwned'
import { createHoldingSchema } from '@/lib/validation/holdings'
import { round2 } from '@/lib/format'

function toDTO(row: { id: string; ticker: string; shares: unknown; costBasis: unknown; accountId: string | null; createdAt: Date }) {
  return {
    id: row.id,
    ticker: row.ticker,
    shares: round2(Number(row.shares)),
    costBasis: row.costBasis != null ? round2(Number(row.costBasis)) : undefined,
    accountId: row.accountId ?? undefined,
    createdAt: row.createdAt.toISOString(),
  }
}

export const GET = withAuthErrorHandling(async () => {
  const { userId } = await getRequiredSession()
  const rows = await db.holding.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json(rows.map(toDTO))
})

export const POST = withAuthErrorHandling(async (req: Request) => {
  const { userId } = await getRequiredSession()
  const parsed = createHoldingSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { accountId } = parsed.data

  if (accountId && !(await assertAccountOwned(accountId, userId))) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  const row = await db.holding.create({ data: { ...parsed.data, userId } })
  return NextResponse.json(toDTO(row), { status: 201 })
})
