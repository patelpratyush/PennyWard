import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { getHouseholdForUser } from '@/lib/household'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { createInviteSchema } from '@/lib/validation/household'

const INVITE_TTL_DAYS = 7

export const POST = withAuthErrorHandling(async (req: Request) => {
  const { userId } = await getRequiredSession()
  const membership = await getHouseholdForUser(userId)
  if (!membership) return NextResponse.json({ error: 'Not a member of a household' }, { status: 404 })
  if (membership.role !== 'owner') return NextResponse.json({ error: 'Only the household owner can invite members' }, { status: 403 })

  const parsed = createInviteSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const invite = await db.householdInvite.create({
    data: {
      householdId: membership.id,
      email: parsed.data.email,
      token: randomUUID(),
      invitedByUserId: userId,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  })
  return NextResponse.json({ id: invite.id, token: invite.token, email: invite.email, expiresAt: invite.expiresAt.toISOString() }, { status: 201 })
})
