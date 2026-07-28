import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/transactions/route'
import { db } from '@/lib/db'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: 'user_test' })) }))

let accountId: string

beforeEach(async () => {
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'txn@example.com' } })
  await db.transaction.deleteMany({ where: { userId: 'user_test' } })
  await db.financialAccount.deleteMany({ where: { userId: 'user_test' } })
  const acc = await db.financialAccount.create({ data: { userId: 'user_test', name: 'Checking', institution: 'X', type: 'checking', balance: 100 } })
  accountId = acc.id
})

describe('POST /api/transactions', () => {
  it('creates a transaction', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ accountId, type: 'expense', amount: 42.5, merchant: 'Coffee', date: '2026-07-01' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})

describe('GET /api/transactions', () => {
  it('filters by date range and paginates', async () => {
    for (let i = 0; i < 3; i++) {
      await db.transaction.create({
        data: { userId: 'user_test', accountId, type: 'expense', amount: 10, merchant: `M${i}`, date: new Date(`2026-0${i + 1}-15`) },
      })
    }
    const req = new Request('http://x/api/transactions?from=2026-02-01&to=2026-03-31&pageSize=10')
    const res = await GET(req)
    const body = await res.json()
    expect(body.items).toHaveLength(2)
    expect(body.total).toBe(2)
  })
})
