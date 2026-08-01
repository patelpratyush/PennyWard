import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { assertCategoryOwned } from '@/lib/assertOwned'
import { upsertBudgetSchema } from '@/lib/validation/budgets'
import { round2 } from '@/lib/format'
import { PLAN_LIMITS, upgradeRequired } from '@/lib/plan'

export const GET = withAuthErrorHandling(async (req: Request) => {
  const { userId } = await getRequiredSession()
  const month = new URL(req.url).searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month query param required' }, { status: 400 })
  const budget = await db.budget.findUnique({ where: { userId_month: { userId, month } }, include: { entries: true } })
  if (!budget) return NextResponse.json(null)
  return NextResponse.json({
    id: budget.id,
    month: budget.month,
    expectedIncome: round2(Number(budget.expectedIncome)),
    savingsTarget: round2(Number(budget.savingsTarget)),
    entries: budget.entries.map((e) => ({ categoryId: e.categoryId, budgeted: round2(Number(e.budgeted)), rollover: e.rollover })),
  })
})

export const PUT = withAuthErrorHandling(async (req: Request) => {
  const { userId, plan } = await getRequiredSession()
  const parsed = upsertBudgetSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { month, entries, expectedIncome, savingsTarget } = parsed.data

  for (const entry of entries) {
    if (!(await assertCategoryOwned(entry.categoryId, userId))) {
      return NextResponse.json({ error: `Category not found: ${entry.categoryId}` }, { status: 404 })
    }
  }

  // Only a genuinely new month counts against the cap — editing a month the
  // user already has (the far more common request, via this same upsert)
  // must never be blocked by a limit meant to cap how many months they hold.
  const limit = PLAN_LIMITS[plan].maxBudgetMonths
  if (Number.isFinite(limit)) {
    const existingForMonth = await db.budget.findUnique({ where: { userId_month: { userId, month } } })
    if (!existingForMonth) {
      const monthCount = await db.budget.count({ where: { userId } })
      if (monthCount >= limit) {
        return NextResponse.json(
          upgradeRequired(`The Free plan keeps ${limit} budget month. Upgrade to Pro for unlimited months.`),
          { status: 403 },
        )
      }
    }
  }

  const budget = await db.budget.upsert({
    where: { userId_month: { userId, month } },
    create: { userId, month, expectedIncome: round2(expectedIncome), savingsTarget: round2(savingsTarget) },
    update: { expectedIncome: round2(expectedIncome), savingsTarget: round2(savingsTarget) },
  })
  await db.budgetEntry.deleteMany({ where: { budgetId: budget.id } })
  if (entries.length > 0) {
    await db.budgetEntry.createMany({
      data: entries.map((e) => ({ categoryId: e.categoryId, budgeted: round2(e.budgeted), rollover: e.rollover, budgetId: budget.id })),
    })
  }
  return NextResponse.json({ id: budget.id })
})
