import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { assertAccountOwned } from '@/lib/assertOwned'
import { createGoalSchema } from '@/lib/validation/goals'
import { round2 } from '@/lib/format'
import { PLAN_LIMITS, upgradeRequired } from '@/lib/plan'
import { markOnboardingStep } from '@/lib/onboarding'

function toDTO(row: Awaited<ReturnType<typeof db.goal.findFirstOrThrow<{ include: { contributions: true } }>>>) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    targetAmount: round2(Number(row.targetAmount)),
    currentAmount: round2(Number(row.currentAmount)),
    targetDate: row.targetDate.toISOString().slice(0, 10),
    monthlyContribution: round2(Number(row.monthlyContribution)),
    accountId: row.accountId ?? undefined,
    priority: row.priority,
    status: row.status,
    notes: row.notes ?? undefined,
    contributions: row.contributions.map((c) => ({
      id: c.id, date: c.date.toISOString().slice(0, 10), amount: round2(Number(c.amount)), note: c.note ?? undefined,
    })),
  }
}

export const GET = withAuthErrorHandling(async () => {
  const { userId } = await getRequiredSession()
  const rows = await db.goal.findMany({ where: { userId }, include: { contributions: true }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json(rows.map(toDTO))
})

export const POST = withAuthErrorHandling(async (req: Request) => {
  const { userId, plan } = await getRequiredSession()
  if (!PLAN_LIMITS[plan].goals) {
    return NextResponse.json(upgradeRequired('Savings goals are a Pro feature. Upgrade to start tracking one.'), { status: 403 })
  }

  const parsed = createGoalSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { targetDate, accountId, ...rest } = parsed.data

  if (accountId && !(await assertAccountOwned(accountId, userId))) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  const row = await db.goal.create({
    data: { ...rest, userId, accountId, targetDate: new Date(targetDate) },
    include: { contributions: true },
  })
  await markOnboardingStep(userId, 'goal')
  return NextResponse.json(toDTO(row), { status: 201 })
})
