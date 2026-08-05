import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/holdings/route'
import { PATCH, DELETE } from '@/app/api/holdings/[id]/route'
import { db } from '@/lib/db'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: currentUserId, plan: 'pro' })) }))

let currentUserId = 'user_test'

beforeEach(async () => {
  currentUserId = 'user_test'
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'hold@example.com' } })
  await db.user.upsert({ where: { id: 'user_other' }, update: {}, create: { id: 'user_other', email: 'hold-other@example.com' } })
  await db.holding.deleteMany({ where: { userId: { in: ['user_test', 'user_other'] } } })
})

const holding = (ticker: string) => new Request('http://x', {
  method: 'POST',
  body: JSON.stringify({ ticker, shares: 10, costBasis: 150.5 }),
})

describe('POST /api/holdings then GET', () => {
  it('round-trips a holding with correct decimal precision and uppercases the ticker', async () => {
    const res = await POST(holding('aapl'))
    expect(res.status).toBe(201)
    const getRes = await GET()
    const body = await getRes.json()
    expect(body[0].ticker).toBe('AAPL')
    expect(body[0].shares).toBe(10)
    expect(body[0].costBasis).toBe(150.5)
  })

  it('rejects a non-positive share count with 400', async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ ticker: 'AAPL', shares: 0 }) })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('GET /api/holdings', () => {
  it('never returns another user\'s holdings', async () => {
    currentUserId = 'user_other'
    await POST(holding('SECRET'))
    currentUserId = 'user_test'
    const res = await GET()
    const body = await res.json()
    expect(body.every((h: { ticker: string }) => h.ticker !== 'SECRET')).toBe(true)
  })
})

describe('holdings cross-user ownership boundary', () => {
  it('PATCH on another user\'s holding returns 404 and leaves it unchanged', async () => {
    currentUserId = 'user_other'
    const created = await (await POST(holding('MSFT'))).json()
    currentUserId = 'user_test'
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ shares: 999 }) })
    const res = await PATCH(req, { params: Promise.resolve({ id: created.id }) })
    expect(res.status).toBe(404)
    const stillThere = await db.holding.findUnique({ where: { id: created.id } })
    expect(Number(stillThere?.shares)).toBe(10)
  })

  it('DELETE on another user\'s holding returns 404 and leaves it in the DB', async () => {
    currentUserId = 'user_other'
    const created = await (await POST(holding('MSFT'))).json()
    currentUserId = 'user_test'
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ id: created.id }) })
    expect(res.status).toBe(404)
    expect(await db.holding.findUnique({ where: { id: created.id } })).not.toBeNull()
  })

  it('PATCH on own holding updates it', async () => {
    const created = await (await POST(holding('NVDA'))).json()
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ shares: 25 }) })
    const res = await PATCH(req, { params: Promise.resolve({ id: created.id }) })
    expect(res.status).toBe(200)
    const updated = await db.holding.findUnique({ where: { id: created.id } })
    expect(Number(updated?.shares)).toBe(25)
  })

  it('DELETE on own holding removes it', async () => {
    const created = await (await POST(holding('TSLA'))).json()
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ id: created.id }) })
    expect(res.status).toBe(200)
    expect(await db.holding.findUnique({ where: { id: created.id } })).toBeNull()
  })
})
