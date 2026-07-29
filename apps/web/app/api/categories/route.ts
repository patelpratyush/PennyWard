import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { createCategorySchema } from '@/lib/validation/categories'

export const GET = withAuthErrorHandling(async () => {
  const { userId } = await getRequiredSession()
  const rows = await db.category.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    orderBy: [{ group: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(rows.map((r) => ({
    id: r.id, name: r.name, group: r.group, icon: r.icon, color: r.color, archived: r.archived, parentId: r.parentId ?? undefined,
  })))
})

export const POST = withAuthErrorHandling(async (req: Request) => {
  const { userId } = await getRequiredSession()
  const parsed = createCategorySchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const row = await db.category.create({ data: { ...parsed.data, userId } })
  return NextResponse.json({ id: row.id }, { status: 201 })
})
