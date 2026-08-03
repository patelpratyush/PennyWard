import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { getHouseholdForUser } from '@/lib/household'
import { withAuthErrorHandling } from '@/lib/withAuth'

export const POST = withAuthErrorHandling(async (_req: Request, { params }: { params: Promise<{ token: string }> }) => {
  const { userId } = await getRequiredSession()
  const { token } = await params

  const invite = await db.householdInvite.findUnique({ where: { token } })
  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  if (invite.status !== 'pending') return NextResponse.json({ error: 'Invite already used or expired' }, { status: 410 })
  if (invite.expiresAt < new Date()) {
    await db.householdInvite.update({ where: { id: invite.id }, data: { status: 'expired' } })
    return NextResponse.json({ error: 'Invite expired' }, { status: 410 })
  }

  const existing = await getHouseholdForUser(userId)
  if (existing) return NextResponse.json({ error: 'Already a member of a household' }, { status: 409 })

  await db.$transaction(async (tx) => {
    await tx.householdMember.create({ data: { householdId: invite.householdId, userId, role: 'member' } })
    await tx.householdInvite.update({ where: { id: invite.id }, data: { status: 'accepted' } })
  })
  return NextResponse.json({ householdId: invite.householdId })
})
