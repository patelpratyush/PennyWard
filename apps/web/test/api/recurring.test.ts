import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, PATCH } from '@/app/api/recurring/route'
import { db } from '@/lib/db'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: 'user_test', plan: 'pro' })) }))

let accountId: string
let categoryId: string

beforeEach(async () => {
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'rec@example.com' } })
  await db.transaction.deleteMany({ where: { userId: 'user_test' } })
  await db.recurringSeries.deleteMany({ where: { userId: 'user_test' } })
  await db.financialAccount.deleteMany({ where: { userId: 'user_test' } })
  const acc = await db.financialAccount.create({ data: { userId: 'user_test', name: 'Checking', institution: 'Chase', type: 'checking', balance: 0 } })
  accountId = acc.id
  categoryId = (await db.category.findFirstOrThrow({ where: { userId: null } })).id
})

async function seedNetflix(dates: string[], amount = 15.99) {
  for (const date of dates) {
    await db.transaction.create({
      data: { userId: 'user_test', accountId, categoryId, type: 'expense', amount, merchant: 'Netflix', date: new Date(date) },
    })
  }
}

describe('GET /api/recurring', () => {
  it('detects a recurring series from real transaction rows', async () => {
    await seedNetflix(['2026-01-05', '2026-02-04', '2026-03-06'])
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].displayName).toBe('Netflix')
    expect(body[0].cadence).toBe('monthly')
    expect(body[0].confirmed).toBe(false)
  })

  it('excludes a series the user dismissed', async () => {
    await seedNetflix(['2026-01-05', '2026-02-04', '2026-03-06'])
    await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ payeeNorm: 'netflix', cadence: 'monthly', action: 'dismiss' }) }))
    const res = await GET()
    const body = await res.json()
    expect(body).toHaveLength(0)
  })

  it('marks a confirmed series', async () => {
    await seedNetflix(['2026-01-05', '2026-02-04', '2026-03-06'])
    await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ payeeNorm: 'netflix', cadence: 'monthly', action: 'confirm' }) }))
    const res = await GET()
    const body = await res.json()
    expect(body[0].confirmed).toBe(true)
  })

  it('never surfaces another user\'s transactions', async () => {
    await db.user.upsert({ where: { id: 'user_other' }, update: {}, create: { id: 'user_other', email: 'rec-other@example.com' } })
    const otherAcc = await db.financialAccount.create({ data: { userId: 'user_other', name: 'Their Checking', institution: 'X', type: 'checking', balance: 0 } })
    for (const date of ['2026-01-05', '2026-02-04', '2026-03-06']) {
      await db.transaction.create({ data: { userId: 'user_other', accountId: otherAcc.id, categoryId, type: 'expense', amount: 9.99, merchant: 'Spotify', date: new Date(date) } })
    }
    const res = await GET()
    const body = await res.json()
    expect(body.every((s: { displayName: string }) => s.displayName !== 'Spotify')).toBe(true)
  })
})

describe('PATCH /api/recurring', () => {
  it('rejects an invalid action with 400', async () => {
    const res = await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ payeeNorm: 'netflix', cadence: 'monthly', action: 'bogus' }) }))
    expect(res.status).toBe(400)
  })
})
