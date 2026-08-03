import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { getHouseholdForUser } from '@/lib/household'
import { withAuthErrorHandling } from '@/lib/withAuth'

export const DELETE = withAuthErrorHandling(async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
  const { userId: callerId } = await getRequiredSession()
  const { userId: targetUserId } = await params

  const membership = await getHouseholdForUser(callerId)
  if (!membership) return NextResponse.json({ error: 'Not a member of a household' }, { status: 404 })

  const isSelf = callerId === targetUserId
  if (!isSelf && membership.role !== 'owner') {
    return NextResponse.json({ error: 'Only the household owner can remove other members' }, { status: 403 })
  }

  const target = await db.householdMember.findFirst({ where: { householdId: membership.id, userId: targetUserId } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (target.role === 'owner') {
    return NextResponse.json({ error: 'The owner cannot be removed — delete the household instead' }, { status: 400 })
  }

  await db.householdMember.delete({ where: { id: target.id } })
  return NextResponse.json({ ok: true })
})
