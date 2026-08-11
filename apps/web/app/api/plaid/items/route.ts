import { NextResponse } from 'next/server'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { db } from '@/lib/db'

export const GET = withAuthErrorHandling(async () => {
  const { userId } = await getRequiredSession()
  const items = await db.plaidItem.findMany({
    where: { userId },
    select: { id: true, institutionName: true, status: true, createdAt: true, accounts: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(items)
})
