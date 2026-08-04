import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { round2 } from '@/lib/format'

export const GET = withAuthErrorHandling(async (req: Request) => {
  const { userId } = await getRequiredSession()
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  // includeInNetWorth/archived are read live off the account, not frozen
  // into the snapshot — toggling either reshapes history the same way the
  // live net-worth widget already behaves (see lib/finance/budget.ts's netWorth()).
  const snapshots = await db.balanceSnapshot.findMany({
    where: {
      userId,
      account: { includeInNetWorth: true, archived: false },
      ...(from || to ? { asOf: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
    },
    select: { asOf: true, balance: true },
    orderBy: { asOf: 'asc' },
  })

  const byDate = new Map<string, { assets: number; liabilities: number }>()
  for (const s of snapshots) {
    const key = s.asOf.toISOString().slice(0, 10)
    const bucket = byDate.get(key) ?? { assets: 0, liabilities: 0 }
    const balance = Number(s.balance)
    if (balance >= 0) bucket.assets += balance
    else bucket.liabilities += Math.abs(balance)
    byDate.set(key, bucket)
  }

  const series = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { assets, liabilities }]) => ({
      date, assets: round2(assets), liabilities: round2(liabilities), netWorth: round2(assets - liabilities),
    }))

  return NextResponse.json(series)
})
