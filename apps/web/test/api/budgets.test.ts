import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, PUT } from '@/app/api/budgets/route'
import { db } from '@/lib/db'

let currentUserId = 'user_test'
// Defaults to 'pro' so the existing tests below (which predate plan gating)
// aren't incidentally constrained by the Free tier's 1-month cap. The cap
// itself is exercised explicitly further down.
let currentPlan: 'free' | 'pro' | 'household' = 'pro'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: currentUserId, plan: currentPlan })) }))

let categoryId: string

beforeEach(async () => {
  currentUserId = 'user_test'
  currentPlan = 'pro'
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

describe('PUT /api/budgets — Free plan cap', () => {
  const body = (month: string) => JSON.stringify({ month, entries: [], expectedIncome: 0, savingsTarget: 0 })

  it('allows the first budget month on Free', async () => {
    currentPlan = 'free'
    const res = await PUT(new Request('http://x', { method: 'PUT', body: body('2026-07') }))
    expect(res.status).toBe(200)
  })

  it('allows editing that same month again on Free (not a new month)', async () => {
    currentPlan = 'free'
    await PUT(new Request('http://x', { method: 'PUT', body: body('2026-07') }))
    const res = await PUT(new Request('http://x', {
      method: 'PUT',
      body: JSON.stringify({ month: '2026-07', entries: [], expectedIncome: 500, savingsTarget: 0 }),
    }))
    expect(res.status).toBe(200)
  })

  it('rejects a second distinct month on Free with 403 upgrade_required', async () => {
    currentPlan = 'free'
    const first = await PUT(new Request('http://x', { method: 'PUT', body: body('2026-07') }))
    expect(first.status).toBe(200)

    const second = await PUT(new Request('http://x', { method: 'PUT', body: body('2026-08') }))
    expect(second.status).toBe(403)
    const responseBody = await second.json()
    expect(responseBody.error).toBe('upgrade_required')

    const count = await db.budget.count({ where: { userId: 'user_test' } })
    expect(count).toBe(1)
  })

  it('allows a second distinct month on Pro', async () => {
    currentPlan = 'pro'
    const first = await PUT(new Request('http://x', { method: 'PUT', body: body('2026-07') }))
    expect(first.status).toBe(200)
    const second = await PUT(new Request('http://x', { method: 'PUT', body: body('2026-08') }))
    expect(second.status).toBe(200)
  })
})

describe('shared household budgets', () => {
  let householdId: string

  beforeEach(async () => {
    await db.householdMember.deleteMany({ where: { userId: { in: ['user_test', 'user_other'] } } })
    await db.household.deleteMany({ where: { ownerId: 'user_test' } })
    const household = await db.household.create({ data: { name: 'Test household', ownerId: 'user_test' } })
    householdId = household.id
    await db.householdMember.create({ data: { householdId, userId: 'user_test', role: 'owner' } })
    await db.householdMember.create({ data: { householdId, userId: 'user_other', role: 'member' } })
    currentPlan = 'household'
  })

  it('a member can see and edit a budget another member created as shared', async () => {
    const createRes = await PUT(new Request('http://x', {
      method: 'PUT',
      body: JSON.stringify({ month: '2026-07', entries: [], expectedIncome: 1000, savingsTarget: 0, shared: true }),
    }))
    expect(createRes.status).toBe(200)

    currentUserId = 'user_other'
    const getRes = await GET(new Request('http://x/api/budgets?month=2026-07'))
    const body = await getRes.json()
    expect(body).not.toBeNull()
    expect(body.expectedIncome).toBe(1000)

    const editRes = await PUT(new Request('http://x', {
      method: 'PUT',
      body: JSON.stringify({ month: '2026-07', entries: [], expectedIncome: 2000, savingsTarget: 0 }),
    }))
    expect(editRes.status).toBe(200)
    const count = await db.budget.count({ where: { householdId, month: '2026-07' } })
    expect(count).toBe(1)
  })

  it('a non-member never sees a shared budget', async () => {
    await PUT(new Request('http://x', {
      method: 'PUT',
      body: JSON.stringify({ month: '2026-07', entries: [], expectedIncome: 1000, savingsTarget: 0, shared: true }),
    }))
    currentUserId = 'user_outsider'
    const res = await GET(new Request('http://x/api/budgets?month=2026-07'))
    const body = await res.json()
    expect(body).toBeNull()
  })

  it('a budget created without shared: true stays personal, invisible to other members', async () => {
    await PUT(new Request('http://x', {
      method: 'PUT',
      body: JSON.stringify({ month: '2026-09', entries: [], expectedIncome: 500, savingsTarget: 0 }),
    }))
    currentUserId = 'user_other'
    const res = await GET(new Request('http://x/api/budgets?month=2026-09'))
    const body = await res.json()
    expect(body).toBeNull()
  })
})
