import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/scenarios/loan/route'
import { PATCH, DELETE } from '@/app/api/scenarios/loan/[id]/route'
import { db } from '@/lib/db'

let currentUserId = 'user_test'
// Defaults to 'pro' so the round-trip/ownership tests below (which predate
// the Free-tier cap) aren't incidentally constrained by it. The cap itself
// is exercised explicitly further down.
let currentPlan: 'free' | 'pro' | 'household' = 'pro'

vi.mock('@/lib/session', () => ({
  getRequiredSession: vi.fn(async () => ({ userId: currentUserId, plan: currentPlan })),
  UnauthorizedError: class UnauthorizedError extends Error {},
}))

beforeEach(async () => {
  currentUserId = 'user_test'
  currentPlan = 'pro'
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'loan@example.com' } })
  await db.user.upsert({ where: { id: 'user_other' }, update: {}, create: { id: 'user_other', email: 'loan-other@example.com' } })
  await db.loanScenario.deleteMany({ where: { userId: { in: ['user_test', 'user_other'] } } })
})

const carScenario = (name: string) => new Request('http://x', {
  method: 'POST',
  body: JSON.stringify({
    name, kind: 'car', preferred: false,
    vehiclePrice: 32000, downPayment: 4000, tradeInValue: 0, tradeInOwed: 0, rebate: 0,
    taxRate: 6.25, docFee: 150, registrationFee: 200, destinationFee: 1200, dealerFees: 400,
    loanAmount: 0, apr: 5.99, termMonths: 60, startDate: '2026-08-01', extraMonthly: 0, oneTimePayment: 0,
  }),
})

describe('POST /api/scenarios/loan then GET', () => {
  it('round-trips a car scenario with correct decimal precision', async () => {
    const res = await POST(carScenario('Sedan'))
    expect(res.status).toBe(201)
    const getRes = await GET()
    const body = await getRes.json()
    expect(body[0].name).toBe('Sedan')
    expect(body[0].vehiclePrice).toBe(32000)
    expect(body[0].apr).toBe(5.99)
    expect(body[0].startDate).toBe('2026-08-01')
  })

  it('rejects an invalid kind with 400', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ name: 'X', kind: 'boat', apr: 5, termMonths: 60, startDate: '2026-08-01' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('GET /api/scenarios/loan', () => {
  it('never returns another user\'s scenarios', async () => {
    currentUserId = 'user_other'
    await POST(carScenario('Secret'))
    currentUserId = 'user_test'
    const res = await GET()
    const body = await res.json()
    expect(body.every((s: { name: string }) => s.name !== 'Secret')).toBe(true)
  })
})

describe('loan-scenarios cross-user ownership boundary', () => {
  it('PATCH on another user\'s scenario returns 404 and leaves it unchanged', async () => {
    currentUserId = 'user_other'
    const created = await (await POST(carScenario('Theirs'))).json()
    currentUserId = 'user_test'
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ name: 'Hacked' }) })
    const res = await PATCH(req, { params: Promise.resolve({ id: created.id }) })
    expect(res.status).toBe(404)
    const stillThere = await db.loanScenario.findUnique({ where: { id: created.id } })
    expect(stillThere?.name).toBe('Theirs')
  })

  it('DELETE on another user\'s scenario returns 404 and leaves it in the DB', async () => {
    currentUserId = 'user_other'
    const created = await (await POST(carScenario('Theirs'))).json()
    currentUserId = 'user_test'
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ id: created.id }) })
    expect(res.status).toBe(404)
    const stillThere = await db.loanScenario.findUnique({ where: { id: created.id } })
    expect(stillThere).not.toBeNull()
  })

  it('PATCH on own scenario updates it', async () => {
    const created = await (await POST(carScenario('Mine'))).json()
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ preferred: true }) })
    const res = await PATCH(req, { params: Promise.resolve({ id: created.id }) })
    expect(res.status).toBe(200)
    const updated = await db.loanScenario.findUnique({ where: { id: created.id } })
    expect(updated?.preferred).toBe(true)
  })

  it('DELETE on own scenario removes it', async () => {
    const created = await (await POST(carScenario('ToDelete'))).json()
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ id: created.id }) })
    expect(res.status).toBe(200)
    const gone = await db.loanScenario.findUnique({ where: { id: created.id } })
    expect(gone).toBeNull()
  })
})

describe('POST /api/scenarios/loan — Free plan cap', () => {
  it('allows the first saved scenario on Free', async () => {
    currentPlan = 'free'
    const res = await POST(carScenario('First'))
    expect(res.status).toBe(201)
  })

  it('rejects a second saved scenario on Free with 403 upgrade_required', async () => {
    currentPlan = 'free'
    const first = await POST(carScenario('First'))
    expect(first.status).toBe(201)

    const second = await POST(carScenario('Second'))
    expect(second.status).toBe(403)
    const body = await second.json()
    expect(body.error).toBe('upgrade_required')

    const count = await db.loanScenario.count({ where: { userId: 'user_test' } })
    expect(count).toBe(1)
  })

  it('allows a second saved scenario on Pro', async () => {
    currentPlan = 'pro'
    const first = await POST(carScenario('First'))
    expect(first.status).toBe(201)
    const second = await POST(carScenario('Second'))
    expect(second.status).toBe(201)
  })
})
