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

  // The token by itself is a bearer credential — anyone who obtains the link
  // could otherwise join, regardless of who it was actually sent to.
  const caller = await db.user.findUnique({ where: { id: userId }, select: { email: true } })
  if (caller?.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json({ error: 'This invite was sent to a different email address' }, { status: 403 })
  }

  const existing = await getHouseholdForUser(userId)
  if (existing) return NextResponse.json({ error: 'Already a member of a household' }, { status: 409 })

  try {
    await db.$transaction(async (tx) => {
      // Atomically claims the invite — if a concurrent request already flipped
      // it out of 'pending', this matches zero rows and throws, so two accepts
      // (even by different users) can't both succeed.
      const claimed = await tx.householdInvite.updateMany({ where: { id: invite.id, status: 'pending' }, data: { status: 'accepted' } })
      if (claimed.count === 0) throw new Error('invite_already_claimed')
      await tx.householdMember.create({ data: { householdId: invite.householdId, userId, role: 'member' } })
    })
  } catch {
    return NextResponse.json({ error: 'Invite already used or expired' }, { status: 410 })
  }
  return NextResponse.json({ householdId: invite.householdId })
})
