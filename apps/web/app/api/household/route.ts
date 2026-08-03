import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { getHouseholdForUser } from '@/lib/household'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { createHouseholdSchema } from '@/lib/validation/household'
import { upgradeRequired } from '@/lib/plan'

export const GET = withAuthErrorHandling(async () => {
  const { userId } = await getRequiredSession()
  const membership = await getHouseholdForUser(userId)
  if (!membership) return NextResponse.json(null)

  const household = await db.household.findUniqueOrThrow({
    where: { id: membership.id },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
  })
  return NextResponse.json({
    id: household.id,
    name: household.name,
    ownerId: household.ownerId,
    role: membership.role,
    members: household.members.map((m) => ({ userId: m.userId, name: m.user.name, email: m.user.email, role: m.role, joinedAt: m.joinedAt.toISOString() })),
  })
})

export const POST = withAuthErrorHandling(async (req: Request) => {
  const { userId, plan } = await getRequiredSession()
  if (plan !== 'household') {
    return NextResponse.json(upgradeRequired('Creating a household requires the Household plan.'), { status: 403 })
  }
  const parsed = createHouseholdSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await getHouseholdForUser(userId)
  if (existing) return NextResponse.json({ error: 'Already a member of a household' }, { status: 409 })

  const household = await db.$transaction(async (tx) => {
    const h = await tx.household.create({ data: { name: parsed.data.name, ownerId: userId } })
    await tx.householdMember.create({ data: { householdId: h.id, userId, role: 'owner' } })
    return h
  })
  return NextResponse.json({ id: household.id, name: household.name }, { status: 201 })
})
