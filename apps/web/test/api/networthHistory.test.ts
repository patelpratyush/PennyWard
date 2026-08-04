import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET as cronSnapshot } from '@/app/api/cron/snapshot-balances/route'
import { GET as historyGet } from '@/app/api/networth/history/route'
import { db } from '@/lib/db'

vi.mock('@/lib/session', () => ({
  getRequiredSession: vi.fn(async () => ({ userId: 'user_nw_test', plan: 'pro' })),
  UnauthorizedError: class UnauthorizedError extends Error {},
}))

const CRON_SECRET = 'test-cron-secret'

beforeEach(async () => {
  process.env.CRON_SECRET = CRON_SECRET
  await db.user.upsert({ where: { id: 'user_nw_test' }, update: {}, create: { id: 'user_nw_test', email: 'nw@example.com' } })
  await db.balanceSnapshot.deleteMany({ where: { userId: 'user_nw_test' } })
  await db.financialAccount.deleteMany({ where: { userId: 'user_nw_test' } })
})

describe('GET /api/cron/snapshot-balances', () => {
  it('rejects a request without the correct bearer secret', async () => {
    const res = await cronSnapshot(new Request('http://x'))
    expect(res.status).toBe(401)
  })

  it('writes one snapshot per non-archived account (skips archived), and is idempotent same-day', async () => {
    const checking = await db.financialAccount.create({ data: { userId: 'user_nw_test', name: 'Checking', institution: 'Chase', type: 'checking', balance: 1000 } })
    const archived = await db.financialAccount.create({ data: { userId: 'user_nw_test', name: 'Old', institution: 'Chase', type: 'checking', balance: 50, archived: true } })

    // Cron runs globally (no userId scoping — it's a system-wide nightly job),
    // so other suites' fixture accounts get snapshotted too; assert on this
    // test's own accounts specifically rather than the response's total count.
    const req = new Request('http://x', { headers: { authorization: `Bearer ${CRON_SECRET}` } })
    const res1 = await cronSnapshot(req)
    expect(res1.status).toBe(200)

    await cronSnapshot(req)

    const checkingCount = await db.balanceSnapshot.count({ where: { accountId: checking.id } })
    expect(checkingCount).toBe(1)
    const archivedCount = await db.balanceSnapshot.count({ where: { accountId: archived.id } })
    expect(archivedCount).toBe(0)
  })
})

describe('GET /api/networth/history', () => {
  it('aggregates snapshots into a daily assets/liabilities/netWorth series, respecting includeInNetWorth', async () => {
    const checking = await db.financialAccount.create({ data: { userId: 'user_nw_test', name: 'Checking', institution: 'Chase', type: 'checking', balance: 1000 } })
    const card = await db.financialAccount.create({ data: { userId: 'user_nw_test', name: 'Card', institution: 'Amex', type: 'credit_card', balance: -300 } })
    const excluded = await db.financialAccount.create({ data: { userId: 'user_nw_test', name: 'Excluded', institution: 'X', type: 'other', balance: 9999, includeInNetWorth: false } })

    const day1 = new Date('2026-07-01')
    await db.balanceSnapshot.create({ data: { userId: 'user_nw_test', accountId: checking.id, balance: 1000, asOf: day1 } })
    await db.balanceSnapshot.create({ data: { userId: 'user_nw_test', accountId: card.id, balance: -300, asOf: day1 } })
    await db.balanceSnapshot.create({ data: { userId: 'user_nw_test', accountId: excluded.id, balance: 9999, asOf: day1 } })

    const res = await historyGet(new Request('http://x/api/networth/history?from=2026-07-01&to=2026-07-01'))
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].assets).toBe(1000)
    expect(body[0].liabilities).toBe(300)
    expect(body[0].netWorth).toBe(700)
  })

  it('never returns another user\'s snapshots', async () => {
    await db.user.upsert({ where: { id: 'user_nw_other' }, update: {}, create: { id: 'user_nw_other', email: 'nw-other@example.com' } })
    const otherAcc = await db.financialAccount.create({ data: { userId: 'user_nw_other', name: 'Theirs', institution: 'X', type: 'checking', balance: 5000 } })
    await db.balanceSnapshot.create({ data: { userId: 'user_nw_other', accountId: otherAcc.id, balance: 5000, asOf: new Date('2026-07-01') } })

    const res = await historyGet(new Request('http://x/api/networth/history'))
    const body = await res.json()
    expect(body).toHaveLength(0)
  })
})
