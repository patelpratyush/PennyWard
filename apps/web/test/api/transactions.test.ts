import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/transactions/route'
import { PATCH, DELETE } from '@/app/api/transactions/[id]/route'
import { db } from '@/lib/db'

let currentUserId = 'user_test'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: currentUserId })) }))

let accountId: string
let otherAccountId: string
let otherTransactionId: string

beforeEach(async () => {
  currentUserId = 'user_test'
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'txn@example.com' } })
  await db.user.upsert({ where: { id: 'user_other' }, update: {}, create: { id: 'user_other', email: 'txn-other@example.com' } })
  await db.transaction.deleteMany({ where: { userId: { in: ['user_test', 'user_other'] } } })
  await db.financialAccount.deleteMany({ where: { userId: { in: ['user_test', 'user_other'] } } })
  const acc = await db.financialAccount.create({ data: { userId: 'user_test', name: 'Checking', institution: 'X', type: 'checking', balance: 100 } })
  accountId = acc.id
  const otherAcc = await db.financialAccount.create({ data: { userId: 'user_other', name: 'Savings', institution: 'Y', type: 'savings', balance: 200 } })
  otherAccountId = otherAcc.id
  const otherTxn = await db.transaction.create({
    data: { userId: 'user_other', accountId: otherAccountId, type: 'expense', amount: 25, merchant: 'OtherMerchant', date: new Date('2026-04-01') },
  })
  otherTransactionId = otherTxn.id
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

describe('cross-user ownership boundary', () => {
  it('POST rejects an accountId belonging to a different user (404)', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ accountId: otherAccountId, type: 'expense', amount: 10, merchant: 'Hack', date: '2026-07-01' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
    const count = await db.transaction.count({ where: { accountId: otherAccountId } })
    expect(count).toBe(1) // only the original seeded transaction, nothing added
  })

  it('PATCH on another user\'s transaction returns 404 and leaves it unchanged', async () => {
    const req = new Request('http://x', {
      method: 'PATCH',
      body: JSON.stringify({ merchant: 'Hacked' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: otherTransactionId }) })
    expect(res.status).toBe(404)
    const stillThere = await db.transaction.findUnique({ where: { id: otherTransactionId } })
    expect(stillThere).not.toBeNull()
    expect(stillThere?.merchant).toBe('OtherMerchant')
  })

  it('DELETE on another user\'s transaction returns 404 and leaves it in the DB', async () => {
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ id: otherTransactionId }) })
    expect(res.status).toBe(404)
    const stillThere = await db.transaction.findUnique({ where: { id: otherTransactionId } })
    expect(stillThere).not.toBeNull()
  })
})
