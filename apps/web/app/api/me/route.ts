import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { PLAN_LIMITS } from '@/lib/plan'

/**
 * The Settings → Subscription page and the client-side plan gates
 * (Goals/Watchlists add buttons, data export, Import CSV button) read the
 * real DB value from here instead of the old localStorage `profile.plan`,
 * which anyone could edit in devtools to grant themselves every tier.
 *
 * `plan` itself has no PATCH: plan changes are manual (DB/admin) until a
 * real billing integration exists — see the `plan` field's doc comment in
 * schema.prisma. PATCH only covers user-owned preferences (weeklyDigestEnabled).
 */
export const GET = withAuthErrorHandling(async () => {
  const { userId, plan } = await getRequiredSession()
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, weeklyDigestEnabled: true } })
  const limits = PLAN_LIMITS[plan]
  // JSON.stringify silently turns Infinity into null — serialize that
  // explicitly here rather than let it happen implicitly, so the client type
  // (`number | null`) matches what actually goes over the wire.
  const serializedLimits = Object.fromEntries(
    Object.entries(limits).map(([k, v]) => [k, typeof v === 'number' && !Number.isFinite(v) ? null : v]),
  )
  return NextResponse.json({
    name: user.name, email: user.email, plan, limits: serializedLimits,
    weeklyDigestEnabled: user.weeklyDigestEnabled,
  })
})

const patchSchema = z.object({ weeklyDigestEnabled: z.boolean() })

export const PATCH = withAuthErrorHandling(async (req: Request) => {
  const { userId } = await getRequiredSession()
  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  await db.user.update({ where: { id: userId }, data: parsed.data })
  return NextResponse.json({ ok: true })
})
