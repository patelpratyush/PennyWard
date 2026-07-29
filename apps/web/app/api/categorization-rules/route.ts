import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { assertCategoryOwned } from '@/lib/assertOwned'
import { createRuleSchema } from '@/lib/validation/rules'

export const GET = withAuthErrorHandling(async () => {
  const { userId } = await getRequiredSession()
  const rows = await db.categorizationRule.findMany({ where: { userId }, orderBy: { priority: 'desc' } })
  return NextResponse.json(rows)
})

export const POST = withAuthErrorHandling(async (req: Request) => {
  const { userId } = await getRequiredSession()
  const parsed = createRuleSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  if (!(await assertCategoryOwned(parsed.data.categoryId, userId))) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }
  const row = await db.categorizationRule.create({ data: { ...parsed.data, userId } })
  return NextResponse.json(row, { status: 201 })
})
