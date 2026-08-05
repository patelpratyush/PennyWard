import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { createContributionSchema } from '@/lib/validation/goals'
import { round2 } from '@/lib/format'

export const POST = withAuthErrorHandling(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const parsed = createContributionSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const goal = await db.goal.findFirst({ where: { id, userId } })
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [contribution] = await db.$transaction([
    db.goalContribution.create({ data: { goalId: id, amount: parsed.data.amount, note: parsed.data.note, date: new Date() } }),
    db.goal.update({ where: { id }, data: { currentAmount: round2(Number(goal.currentAmount) + parsed.data.amount) } }),
  ])

  return NextResponse.json({
    id: contribution.id,
    date: contribution.date.toISOString().slice(0, 10),
    amount: round2(Number(contribution.amount)),
    note: contribution.note ?? undefined,
  }, { status: 201 })
})
