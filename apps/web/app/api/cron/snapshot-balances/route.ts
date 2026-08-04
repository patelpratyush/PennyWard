import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Nightly (see vercel.json's cron schedule): writes one BalanceSnapshot per
 * non-archived account for today. Idempotent — re-running the same day
 * upserts the same row via the (accountId, asOf) unique constraint, so a
 * manual retry or a Vercel-triggered redelivery can't double-write.
 *
 * Vercel signs cron requests with `Authorization: Bearer $CRON_SECRET` when
 * that env var is set — this route rejects anything else so it can't be
 * triggered by an arbitrary public request.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accounts = await db.financialAccount.findMany({
    where: { archived: false },
    select: { id: true, userId: true, balance: true },
  })

  const asOf = new Date(new Date().toISOString().slice(0, 10))
  await Promise.all(accounts.map((account) =>
    db.balanceSnapshot.upsert({
      where: { accountId_asOf: { accountId: account.id, asOf } },
      create: { userId: account.userId, accountId: account.id, balance: account.balance, asOf },
      update: { balance: account.balance },
    }),
  ))

  return NextResponse.json({ written: accounts.length })
}

export const POST = GET
