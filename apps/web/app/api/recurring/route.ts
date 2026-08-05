import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { detectRecurring } from '@/lib/finance/recurring'
import { recurringActionSchema } from '@/lib/validation/recurring'
import { round2 } from '@/lib/format'

export const GET = withAuthErrorHandling(async () => {
  const { userId } = await getRequiredSession()

  const [transactions, dismissed] = await Promise.all([
    db.transaction.findMany({ where: { userId }, select: { type: true, merchant: true, date: true, amount: true } }),
    db.recurringSeries.findMany({ where: { userId }, select: { payeeNorm: true, confirmed: true, dismissedAt: true } }),
  ])
  const dismissedSet = new Set(dismissed.filter((d) => d.dismissedAt != null).map((d) => d.payeeNorm))
  const confirmedSet = new Set(dismissed.filter((d) => d.confirmed).map((d) => d.payeeNorm))

  const detected = detectRecurring(
    transactions.map((t) => ({ type: t.type, merchant: t.merchant, date: t.date.toISOString().slice(0, 10), amount: round2(Number(t.amount)) })),
  )

  const series = detected
    .filter((s) => !dismissedSet.has(s.payeeNorm))
    .map((s) => ({ ...s, confirmed: confirmedSet.has(s.payeeNorm) }))

  return NextResponse.json(series)
})

export const PATCH = withAuthErrorHandling(async (req: Request) => {
  const { userId } = await getRequiredSession()
  const parsed = recurringActionSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { payeeNorm, cadence, action } = parsed.data

  await db.recurringSeries.upsert({
    where: { userId_payeeNorm: { userId, payeeNorm } },
    create: { userId, payeeNorm, cadence, confirmed: action === 'confirm', dismissedAt: action === 'dismiss' ? new Date() : null },
    update: { cadence, confirmed: action === 'confirm', dismissedAt: action === 'dismiss' ? new Date() : null },
  })

  return NextResponse.json({ ok: true })
})
