import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { updateCategorySchema } from '@/lib/validation/categories'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const parsed = updateCategorySchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const existing = await db.category.findFirst({ where: { id, userId } }) // system categories (userId null) are not editable
  if (!existing) return NextResponse.json({ error: 'Not found or not editable' }, { status: 404 })
  const row = await db.category.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ id: row.id })
}
