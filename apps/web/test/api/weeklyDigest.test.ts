import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET as cronDigest } from '@/app/api/cron/weekly-digest/route'
import { GET as meGet, PATCH as mePatch } from '@/app/api/me/route'
import { buildWeeklyDigest } from '@/lib/digest'
import { db } from '@/lib/db'

const sendMock = vi.fn(async (_opts: { to: string }) => ({ data: { id: 'email_test' }, error: null }))
vi.mock('@/lib/resend', () => ({
  getResendClient: () => ({ emails: { send: sendMock } }),
  DIGEST_FROM: 'Pennyward <onboarding@resend.dev>',
}))

let currentUserId = 'user_digest_test'
vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: currentUserId, plan: 'pro' })) }))

const CRON_SECRET = 'test-cron-secret'

beforeEach(async () => {
  process.env.CRON_SECRET = CRON_SECRET
  currentUserId = 'user_digest_test'
  sendMock.mockClear()
  await db.transaction.deleteMany({ where: { userId: { in: ['user_digest_test', 'user_digest_optout'] } } })
  await db.financialAccount.deleteMany({ where: { userId: { in: ['user_digest_test', 'user_digest_optout'] } } })
  await db.user.upsert({ where: { id: 'user_digest_test' }, update: { weeklyDigestEnabled: true }, create: { id: 'user_digest_test', email: 'digest@example.com', weeklyDigestEnabled: true } })
  await db.user.upsert({ where: { id: 'user_digest_optout' }, update: { weeklyDigestEnabled: false }, create: { id: 'user_digest_optout', email: 'optout@example.com', weeklyDigestEnabled: false } })
})

describe('GET /api/cron/weekly-digest', () => {
  it('rejects a request without the correct bearer secret', async () => {
    const res = await cronDigest(new Request('http://x'))
    expect(res.status).toBe(401)
  })

  it('sends only to opted-in users with an email address', async () => {
    const req = new Request('http://x', { headers: { authorization: `Bearer ${CRON_SECRET}` } })
    await cronDigest(req)
    const sentTo = sendMock.mock.calls.map((c) => c[0].to)
    expect(sentTo).toContain('digest@example.com')
    expect(sentTo).not.toContain('optout@example.com')
  })
})

describe('buildWeeklyDigest', () => {
  it('aggregates this week\'s income/expenses from real transactions', async () => {
    const acc = await db.financialAccount.create({ data: { userId: 'user_digest_test', name: 'Checking', institution: 'Chase', type: 'checking', balance: 500 } })
    const category = await db.category.findFirstOrThrow({ where: { userId: null } })
    await db.transaction.create({ data: { userId: 'user_digest_test', accountId: acc.id, categoryId: category.id, type: 'income', amount: 1000, merchant: 'Payroll', date: new Date() } })
    await db.transaction.create({ data: { userId: 'user_digest_test', accountId: acc.id, categoryId: category.id, type: 'expense', amount: 60, merchant: 'Groceries', date: new Date() } })

    const digest = await buildWeeklyDigest('user_digest_test')
    expect(digest.weekIncome).toBe(1000)
    expect(digest.weekExpenses).toBe(60)
    expect(digest.weekNet).toBe(940)
    expect(digest.netWorth).toBe(500)
    expect(digest.topCategories[0]?.amount).toBe(60)
  })
})

describe('GET/PATCH /api/me — weeklyDigestEnabled', () => {
  it('defaults to false and can be toggled on', async () => {
    currentUserId = 'user_digest_optout'
    const before = await (await meGet()).json()
    expect(before.weeklyDigestEnabled).toBe(false)

    const patchRes = await mePatch(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ weeklyDigestEnabled: true }) }))
    expect(patchRes.status).toBe(200)

    const after = await (await meGet()).json()
    expect(after.weeklyDigestEnabled).toBe(true)
  })

  it('rejects a malformed body with 400', async () => {
    const res = await mePatch(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ weeklyDigestEnabled: 'yes' }) }))
    expect(res.status).toBe(400)
  })
})
