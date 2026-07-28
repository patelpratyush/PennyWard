import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, PUT } from '@/app/api/budgets/route'
import { db } from '@/lib/db'

let currentUserId = 'user_test'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: currentUserId })) }))

let categoryId: string

beforeEach(async () => {
  currentUserId = 'user_test'
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'bud@example.com' } })
  await db.user.upsert({ where: { id: 'user_other' }, update: {}, create: { id: 'user_other', email: 'bud-other@example.com' } })
  await db.budget.deleteMany({ where: { userId: { in: ['user_test', 'user_other'] } } })
  categoryId = (await db.category.findFirstOrThrow({ where: { userId: null } })).id
})

describe('PUT /api/budgets', () => {
  it('creates then updates the same month idempotently', async () => {
    const body = { month: '2026-07', entries: [{ categoryId, budgeted: 500, rollover: false }], expectedIncome: 6000, savingsTarget: 500 }
    await PUT(new Request('http://x', { method: 'PUT', body: JSON.stringify(body) }))
    const res2 = await PUT(new Request('http://x', { method: 'PUT', body: JSON.stringify({ ...body, expectedIncome: 6500 }) }))
    expect(res2.status).toBe(200)
    const count = await db.budget.count({ where: { userId: 'user_test', month: '2026-07' } })
    expect(count).toBe(1)
    const budget = await db.budget.findUniqueOrThrow({ where: { userId_month: { userId: 'user_test', month: '2026-07' } } })
    expect(Number(budget.expectedIncome)).toBe(6500)
  })

  it('rejects an invalid month format', async () => {
    const body = { month: '2026-7', entries: [], expectedIncome: 0, savingsTarget: 0 }
    const res = await PUT(new Request('http://x', { method: 'PUT', body: JSON.stringify(body) }))
    expect(res.status).toBe(400)
  })
})

describe('GET /api/budgets', () => {
  it('returns null for a month with no budget', async () => {
    const res = await GET(new Request('http://x/api/budgets?month=2099-01'))
    const body = await res.json()
    expect(body).toBeNull()
  })

  it('returns 400 when month query param is missing', async () => {
    const res = await GET(new Request('http://x/api/budgets'))
    expect(res.status).toBe(400)
  })
})

describe('cross-user ownership boundary', () => {
  it('GET does not return another user\'s budget for the same month', async () => {
    await db.budget.create({ data: { userId: 'user_other', month: '2026-08', expectedIncome: 1000, savingsTarget: 100 } })

    currentUserId = 'user_test'
    const res = await GET(new Request('http://x/api/budgets?month=2026-08'))
    const body = await res.json()
    expect(body).toBeNull()
  })

  it('PUT does not modify another user\'s budget for the same month', async () => {
    const other = await db.budget.create({ data: { userId: 'user_other', month: '2026-09', expectedIncome: 1000, savingsTarget: 100 } })
    await db.budgetEntry.create({ data: { budgetId: other.id, categoryId, budgeted: 250, rollover: false } })

    currentUserId = 'user_test'
    const body = { month: '2026-09', entries: [{ categoryId, budgeted: 999, rollover: false }], expectedIncome: 9999, savingsTarget: 0 }
    const res = await PUT(new Request('http://x', { method: 'PUT', body: JSON.stringify(body) }))
    expect(res.status).toBe(200)

    const untouched = await db.budget.findUniqueOrThrow({ where: { id: other.id } })
    expect(Number(untouched.expectedIncome)).toBe(1000)
    const untouchedEntries = await db.budgetEntry.findMany({ where: { budgetId: other.id } })
    expect(untouchedEntries).toHaveLength(1)
    expect(Number(untouchedEntries[0].budgeted)).toBe(250)

    const mine = await db.budget.findUniqueOrThrow({ where: { userId_month: { userId: 'user_test', month: '2026-09' } } })
    expect(Number(mine.expectedIncome)).toBe(9999)
  })
})
