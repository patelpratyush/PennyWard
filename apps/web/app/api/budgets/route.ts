import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { upsertBudgetSchema } from '@/lib/validation/budgets'
import { round2 } from '@/lib/format'

export async function GET(req: Request) {
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
}

export async function PUT(req: Request) {
  const { userId } = await getRequiredSession()
  const parsed = upsertBudgetSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { month, entries, expectedIncome, savingsTarget } = parsed.data

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
}
