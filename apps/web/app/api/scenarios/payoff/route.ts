import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { savePayoffScenarioSchema } from '@/lib/validation/debts'
import { round2 } from '@/lib/format'
import { PLAN_LIMITS, upgradeRequired } from '@/lib/plan'
import { syncDebtFreeGoal } from './syncGoal'

function toDTO(row: Awaited<ReturnType<typeof db.payoffScenario.findFirstOrThrow>>) {
  return {
    id: row.id, name: row.name, strategy: row.strategy,
    extraMonthly: round2(Number(row.extraMonthly)), oneTimePayment: round2(Number(row.oneTimePayment)),
    startMonth: row.startMonth, customOrder: row.customOrder,
  }
}

export const GET = withAuthErrorHandling(async () => {
  const { userId } = await getRequiredSession()
  const rows = await db.payoffScenario.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json(rows.map(toDTO))
})

export const POST = withAuthErrorHandling(async (req: Request) => {
  const { userId, plan } = await getRequiredSession()
  const parsed = savePayoffScenarioSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const limit = PLAN_LIMITS[plan].maxDebtPayoffScenarios
  if (Number.isFinite(limit)) {
    const existing = await db.payoffScenario.count({ where: { userId } })
    if (existing >= limit) {
      return NextResponse.json(
        upgradeRequired(`The Free plan saves ${limit} debt-payoff scenario. Upgrade to Pro to save more.`),
        { status: 403 },
      )
    }
  }

  const row = await db.payoffScenario.create({ data: { ...parsed.data, userId } })
  await syncDebtFreeGoal(
    userId, row.id, row.name, Number(row.extraMonthly), Number(row.oneTimePayment),
    row.startMonth, row.strategy, row.customOrder,
  )
  return NextResponse.json(toDTO(row), { status: 201 })
})
