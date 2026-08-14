import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { assertAccountOwned, assertCategoryOwned } from '@/lib/assertOwned'
import { createTransactionSchema, listQuerySchema } from '@/lib/validation/transactions'
import { round2 } from '@/lib/format'
import { markOnboardingStep } from '@/lib/onboarding'
import type { Prisma } from '@prisma/client'

function toDTO(row: {
  id: string
  accountId: string
  categoryId: string | null
  type: string
  amount: unknown
  merchant: string
  description: string | null
  date: Date
  notes: string | null
  tags: string[]
  recurring: boolean
  cleared: boolean
  source: string
  createdAt: Date
}) {
  return {
    id: row.id,
    accountId: row.accountId,
    categoryId: row.categoryId ?? undefined,
    type: row.type,
    amount: round2(Number(row.amount)),
    merchant: row.merchant,
    description: row.description ?? undefined,
    date: row.date.toISOString().slice(0, 10),
    notes: row.notes ?? undefined,
    tags: row.tags,
    recurring: row.recurring,
    cleared: row.cleared,
    importSource: row.source,
    createdAt: row.createdAt.toISOString(),
  }
}

export const GET = withAuthErrorHandling(async (req: Request) => {
  const { userId } = await getRequiredSession()
  const url = new URL(req.url)
  const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { from, to, categoryId, accountId, q, page, pageSize } = parsed.data

  const where: Prisma.TransactionWhereInput = { userId }
  if (from || to) where.date = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) }
  if (categoryId) where.categoryId = categoryId
  if (accountId) where.accountId = accountId
  if (q) where.merchant = { contains: q, mode: 'insensitive' }

  const [items, total] = await Promise.all([
    db.transaction.findMany({ where, orderBy: { date: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    db.transaction.count({ where }),
  ])
  return NextResponse.json({ items: items.map(toDTO), total })
})

export const POST = withAuthErrorHandling(async (req: Request) => {
  const { userId } = await getRequiredSession()
  const parsed = createTransactionSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  if (!(await assertAccountOwned(parsed.data.accountId, userId))) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }
  if (parsed.data.categoryId && !(await assertCategoryOwned(parsed.data.categoryId, userId))) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }
  const row = await db.transaction.create({ data: { ...parsed.data, date: new Date(parsed.data.date), userId, source: 'manual' } })
  await markOnboardingStep(userId, 'transaction')
  return NextResponse.json(toDTO(row), { status: 201 })
})
