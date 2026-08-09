import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { assertAccountOwned } from '@/lib/assertOwned'
import { importHoldingsSchema } from '@/lib/validation/holdings'

/** R6.1: bulk CSV import for holdings, mirroring the single-add validation
 * (positive shares, uppercased ticker) but creating many rows in one call —
 * unlike transactions there's no dedupe hash here, since separate purchase
 * lots of the same ticker are legitimately separate rows in a brokerage. */
export const POST = withAuthErrorHandling(async (req: Request) => {
  const { userId } = await getRequiredSession()
  const parsed = importHoldingsSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { accountId, rows } = parsed.data

  if (accountId && !(await assertAccountOwned(accountId, userId))) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  const { count } = await db.holding.createMany({
    data: rows.map((r) => ({ userId, accountId: accountId ?? null, ticker: r.ticker, shares: r.shares, costBasis: r.costBasis })),
  })
  return NextResponse.json({ imported: count })
})
