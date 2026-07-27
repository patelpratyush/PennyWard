import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/accounts/route'
import { db } from '@/lib/db'

vi.mock('@/lib/session', () => ({
  getRequiredSession: vi.fn(async () => ({ userId: 'user_test' })),
}))

beforeEach(async () => {
  await db.financialAccount.deleteMany({ where: { userId: { in: ['user_test', 'user_other'] } } })
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'test@example.com' } })
  await db.user.upsert({ where: { id: 'user_other' }, update: {}, create: { id: 'user_other', email: 'other@example.com' } })
})

describe('POST /api/accounts', () => {
  it('creates an account scoped to the session user', async () => {
    const req = new Request('http://localhost/api/accounts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Chase Checking', institution: 'Chase', type: 'checking', balance: 1000 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.name).toBe('Chase Checking')
    const row = await db.financialAccount.findUnique({ where: { id: body.id } })
    expect(row?.userId).toBe('user_test')
  })

  it('rejects an invalid type with 400', async () => {
    const req = new Request('http://localhost/api/accounts', {
      method: 'POST',
      body: JSON.stringify({ name: 'X', institution: 'Y', type: 'not_a_type', balance: 0 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('GET /api/accounts', () => {
  it('never returns another user\'s accounts', async () => {
    await db.financialAccount.create({
      data: { userId: 'user_other', name: 'Secret', institution: 'X', type: 'checking', balance: 500 },
    })
    const res = await GET()
    const body = await res.json()
    expect(body.every((a: { name: string }) => a.name !== 'Secret')).toBe(true)
  })

  it('preserves genuine zero values for money fields instead of dropping them to undefined', async () => {
    await db.financialAccount.create({
      data: {
        userId: 'user_test',
        name: 'Paid Off Card',
        institution: 'Bank',
        type: 'credit_card',
        balance: 0,
        creditLimit: 0,
        apr: 0,
        minimumPayment: 0,
        originalBalance: 0,
      },
    })
    const res = await GET()
    const body = await res.json()
    const account = body.find((a: { name: string }) => a.name === 'Paid Off Card')
    expect(account).toBeDefined()
    expect(account.creditLimit).toBe(0)
    expect(account.apr).toBe(0)
    expect(account.minimumPayment).toBe(0)
    expect(account.originalBalance).toBe(0)
  })
})
