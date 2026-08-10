import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildWeeklyDigest } from '@/lib/digest'
import { getResendClient, DIGEST_FROM } from '@/lib/resend'
import WeeklyDigestEmail from '@/emails/WeeklyDigest'

/**
 * Weekly (see vercel.json's cron schedule): sends the opt-in digest to every
 * user with weeklyDigestEnabled=true. Vercel signs cron requests with
 * `Authorization: Bearer $CRON_SECRET` — same pattern as
 * /api/cron/snapshot-balances. Best-effort per user: one failed send
 * (e.g. Resend's free-tier "can only send to your own verified address"
 * restriction before a custom domain is verified) doesn't block the rest.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pennyward.vercel.app'
  const users = await db.user.findMany({
    where: { weeklyDigestEnabled: true, email: { not: null } },
    select: { id: true, email: true },
  })

  const resend = getResendClient()
  let sent = 0
  const failed: string[] = []

  for (const user of users) {
    try {
      const data = await buildWeeklyDigest(user.id)
      await resend.emails.send({
        from: DIGEST_FROM,
        to: user.email!,
        subject: `Your week: ${data.weekNet >= 0 ? '+' : '-'}$${Math.abs(data.weekNet).toFixed(2)} net`,
        react: WeeklyDigestEmail({ data, appUrl }),
      })
      sent++
    } catch {
      failed.push(user.id)
    }
  }

  return NextResponse.json({ sent, failed: failed.length })
}

export const POST = GET
