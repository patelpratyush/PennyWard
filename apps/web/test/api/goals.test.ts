import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/goals/route'
import { PATCH, DELETE } from '@/app/api/goals/[id]/route'
import { POST as addContribution } from '@/app/api/goals/[id]/contributions/route'
import { db } from '@/lib/db'

// Defaults to 'pro' so the round-trip/ownership tests below (which predate
// the Free-tier block) aren't incidentally blocked by it. The block itself
// is exercised explicitly further down.
let currentUserId = 'user_test'
let currentPlan: 'free' | 'pro' | 'household' = 'pro'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: currentUserId, plan: currentPlan })) }))

beforeEach(async () => {
  currentUserId = 'user_test'
  currentPlan = 'pro'
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'goal@example.com' } })
  await db.user.upsert({ where: { id: 'user_other' }, update: {}, create: { id: 'user_other', email: 'goal-other@example.com' } })
  await db.goal.deleteMany({ where: { userId: { in: ['user_test', 'user_other'] } } })
})

const goal = (name: string) => new Request('http://x', {
  method: 'POST',
  body: JSON.stringify({
    name, type: 'emergency', targetAmount: 10000, currentAmount: 2000,
    targetDate: '2027-12-31', monthlyContribution: 300, priority: 'medium', status: 'on_track',
  }),
})

describe('POST /api/goals then GET', () => {
  it('round-trips a goal with correct decimal precision', async () => {
    const res = await POST(goal('Emergency Fund'))
    expect(res.status).toBe(201)
    const getRes = await GET()
    const body = await getRes.json()
    expect(body[0].name).toBe('Emergency Fund')
    expect(body[0].targetAmount).toBe(10000)
    expect(body[0].currentAmount).toBe(2000)
    expect(body[0].contributions).toEqual([])
  })

  it('rejects an invalid type with 400', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ name: 'X', type: 'not_a_type', targetAmount: 100, targetDate: '2027-01-01' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('GET /api/goals', () => {
  it('never returns another user\'s goals', async () => {
    currentUserId = 'user_other'
    await POST(goal('Secret'))
    currentUserId = 'user_test'
    const res = await GET()
    const body = await res.json()
    expect(body.every((g: { name: string }) => g.name !== 'Secret')).toBe(true)
  })
})

describe('goals cross-user ownership boundary', () => {
  it('PATCH on another user\'s goal returns 404 and leaves it unchanged', async () => {
    currentUserId = 'user_other'
    const created = await (await POST(goal('Theirs'))).json()
    currentUserId = 'user_test'
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ name: 'Hacked' }) })
    const res = await PATCH(req, { params: Promise.resolve({ id: created.id }) })
    expect(res.status).toBe(404)
    const stillThere = await db.goal.findUnique({ where: { id: created.id } })
    expect(stillThere?.name).toBe('Theirs')
  })

  it('DELETE on another user\'s goal returns 404 and leaves it in the DB', async () => {
    currentUserId = 'user_other'
    const created = await (await POST(goal('Theirs'))).json()
    currentUserId = 'user_test'
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ id: created.id }) })
    expect(res.status).toBe(404)
    expect(await db.goal.findUnique({ where: { id: created.id } })).not.toBeNull()
  })

  it('PATCH on own goal updates it', async () => {
    const created = await (await POST(goal('Mine'))).json()
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ status: 'paused' }) })
    const res = await PATCH(req, { params: Promise.resolve({ id: created.id }) })
    expect(res.status).toBe(200)
    const updated = await db.goal.findUnique({ where: { id: created.id } })
    expect(updated?.status).toBe('paused')
  })

  it('DELETE on own goal removes it', async () => {
    const created = await (await POST(goal('ToDelete'))).json()
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ id: created.id }) })
    expect(res.status).toBe(200)
    expect(await db.goal.findUnique({ where: { id: created.id } })).toBeNull()
  })

  it('cannot add a contribution to another user\'s goal', async () => {
    currentUserId = 'user_other'
    const created = await (await POST(goal('Theirs'))).json()
    currentUserId = 'user_test'
    const res = await addContribution(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ amount: 50 }) }),
      { params: Promise.resolve({ id: created.id }) },
    )
    expect(res.status).toBe(404)
  })
})

describe('POST /api/goals/[id]/contributions', () => {
  it('creates a contribution and bumps currentAmount', async () => {
    const created = await (await POST(goal('Vacation'))).json()
    const res = await addContribution(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ amount: 150, note: 'Monthly transfer' }) }),
      { params: Promise.resolve({ id: created.id }) },
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.amount).toBe(150)
    expect(body.note).toBe('Monthly transfer')

    const updated = await db.goal.findUnique({ where: { id: created.id } })
    expect(Number(updated?.currentAmount)).toBe(2150)
    const contributions = await db.goalContribution.findMany({ where: { goalId: created.id } })
    expect(contributions).toHaveLength(1)
  })

  it('rejects a non-positive amount with 400', async () => {
    const created = await (await POST(goal('Vacation'))).json()
    const res = await addContribution(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ amount: 0 }) }),
      { params: Promise.resolve({ id: created.id }) },
    )
    expect(res.status).toBe(400)
  })
})

describe('POST /api/goals — Free plan block', () => {
  it('rejects goal creation entirely on Free with 403 upgrade_required', async () => {
    currentPlan = 'free'
    const res = await POST(goal('First goal'))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('upgrade_required')

    const count = await db.goal.count({ where: { userId: 'user_test' } })
    expect(count).toBe(0)
  })

  it('allows goal creation on Pro', async () => {
    currentPlan = 'pro'
    const res = await POST(goal('First goal'))
    expect(res.status).toBe(201)
  })
})
