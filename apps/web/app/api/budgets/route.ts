import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { getHouseholdForUser, getHouseholdMemberIds } from '@/lib/household'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { assertCategoryOwned } from '@/lib/assertOwned'
import { upsertBudgetSchema } from '@/lib/validation/budgets'
import { round2 } from '@/lib/format'
import { PLAN_LIMITS, upgradeRequired } from '@/lib/plan'
import { markOnboardingStep } from '@/lib/onboarding'

/**
 * A caller can see at most one budget per month: their own personal one, or —
 * only if they don't have a personal one for that month — the one shared to
 * their household. Personal always takes precedence, so GET and PUT can never
 * disagree about which row they mean (no OR-across-two-owners ambiguity).
 */
async function findVisibleBudget(userId: string, month: string, householdId: string | undefined) {
  const personal = await db.budget.findUnique({ where: { userId_month: { userId, month } } })
  if (personal) return personal
  if (!householdId) return null
  return db.budget.findFirst({ where: { householdId, month } })
}

export const GET = withAuthErrorHandling(async (req: Request) => {
  const { userId } = await getRequiredSession()
  const month = new URL(req.url).searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month query param required' }, { status: 400 })
  const householdId = (await getHouseholdForUser(userId))?.id
  const budget = await findVisibleBudget(userId, month, householdId)
  if (!budget) return NextResponse.json(null)
  const entries = await db.budgetEntry.findMany({ where: { budgetId: budget.id } })
  return NextResponse.json({
    id: budget.id,
    month: budget.month,
    expectedIncome: round2(Number(budget.expectedIncome)),
    savingsTarget: round2(Number(budget.savingsTarget)),
    shared: budget.householdId != null,
    entries: entries.map((e) => ({ categoryId: e.categoryId, budgeted: round2(Number(e.budgeted)), rollover: e.rollover })),
  })
})

export const PUT = withAuthErrorHandling(async (req: Request) => {
  const { userId, plan } = await getRequiredSession()
  const parsed = upsertBudgetSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { month, entries, expectedIncome, savingsTarget, shared } = parsed.data

  const householdId = (await getHouseholdForUser(userId))?.id
  const existingForMonth = await findVisibleBudget(userId, month, householdId)

  // A shared budget's entries may reference a category owned by any member of
  // the household, not just the caller — the budget is jointly edited.
  const extraOwnerIds = existingForMonth?.householdId ? await getHouseholdMemberIds(existingForMonth.householdId) : []
  for (const entry of entries) {
    if (!(await assertCategoryOwned(entry.categoryId, userId, extraOwnerIds))) {
      return NextResponse.json({ error: `Category not found: ${entry.categoryId}` }, { status: 400 })
    }
  }

  // Only a genuinely new month counts against the cap — editing a month the
  // caller (or their household) already has must never be blocked by a limit
  // meant to cap how many distinct months they hold. In practice this never
  // fires for a shared budget: only the Household plan can share one, and
  // that plan's maxBudgetMonths is already unlimited.
  const limit = PLAN_LIMITS[plan].maxBudgetMonths
  if (Number.isFinite(limit) && !existingForMonth) {
    const monthCount = await db.budget.count({ where: { userId } })
    if (monthCount >= limit) {
      return NextResponse.json(
        upgradeRequired(`The Free plan keeps ${limit} budget month. Upgrade to Pro for unlimited months.`),
        { status: 403 },
      )
    }
  }

  const budget = existingForMonth
    ? await db.budget.update({
        where: { id: existingForMonth.id },
        data: { expectedIncome: round2(expectedIncome), savingsTarget: round2(savingsTarget) },
      })
    : await db.budget.create({
        data: {
          userId, month, expectedIncome: round2(expectedIncome), savingsTarget: round2(savingsTarget),
          ...(shared && householdId ? { householdId } : {}),
        },
      })
  await db.$transaction([
    db.budgetEntry.deleteMany({ where: { budgetId: budget.id } }),
    ...(entries.length > 0
      ? [db.budgetEntry.createMany({
          data: entries.map((e) => ({ categoryId: e.categoryId, budgeted: round2(e.budgeted), rollover: e.rollover, budgetId: budget.id })),
        })]
      : []),
  ])
  await markOnboardingStep(userId, 'budget')
  return NextResponse.json({ id: budget.id })
})
