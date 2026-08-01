import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/debts/route'
import { PATCH, DELETE } from '@/app/api/debts/[id]/route'
import { GET as scenariosGET, POST as scenariosPOST } from '@/app/api/scenarios/payoff/route'
import { PATCH as scenarioPATCH, DELETE as scenarioDELETE } from '@/app/api/scenarios/payoff/[id]/route'
import { db } from '@/lib/db'

let currentUserId = 'user_test'
// Defaults to 'pro' so the existing round-trip/ownership tests below (which
// predate plan gating) aren't incidentally constrained by the Free tier's
// 1-scenario cap. The cap itself is exercised explicitly further down.
let currentPlan: 'free' | 'pro' | 'household' = 'pro'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: currentUserId, plan: currentPlan })) }))

beforeEach(async () => {
  currentUserId = 'user_test'
  currentPlan = 'pro'
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'debt@example.com' } })
  await db.user.upsert({ where: { id: 'user_other' }, update: {}, create: { id: 'user_other', email: 'debt-other@example.com' } })
  await db.payoffScenario.deleteMany({ where: { userId: { in: ['user_test', 'user_other'] } } })
  await db.debt.deleteMany({ where: { userId: { in: ['user_test', 'user_other'] } } })
})

describe('POST /api/debts then GET', () => {
  it('round-trips a debt with correct decimal precision', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ name: 'Car Loan', lender: 'Honda', type: 'auto_loan', balance: 27420.55, originalBalance: 33500, apr: 5.99, minimumPayment: 647, dueDay: 15 }),
    })
    const postRes = await POST(req)
    expect(postRes.status).toBe(201)
    const getRes = await GET()
    const body = await getRes.json()
    expect(body[0].balance).toBe(27420.55)
    expect(body[0].apr).toBe(5.99)
  })

  it('rejects an invalid type with 400', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ name: 'X', lender: 'Y', type: 'not_a_type', balance: 0, originalBalance: 0, apr: 0, minimumPayment: 0, dueDay: 1 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('GET /api/debts', () => {
  it('never returns another user\'s debts', async () => {
    await db.debt.create({
      data: { userId: 'user_other', name: 'Secret', lender: 'Z', type: 'other', balance: 100, originalBalance: 100, apr: 1, minimumPayment: 10, dueDay: 1 },
    })
    const res = await GET()
    const body = await res.json()
    expect(body.every((d: { name: string }) => d.name !== 'Secret')).toBe(true)
  })
})

describe('debts cross-user ownership boundary', () => {
  it('PATCH on another user\'s debt returns 404 and leaves it unchanged', async () => {
    const other = await db.debt.create({
      data: { userId: 'user_other', name: 'Their Card', lender: 'Z', type: 'credit_card', balance: 500, originalBalance: 500, apr: 20, minimumPayment: 25, dueDay: 1 },
    })
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ name: 'Hacked' }) })
    const res = await PATCH(req, { params: Promise.resolve({ id: other.id }) })
    expect(res.status).toBe(404)
    const stillThere = await db.debt.findUnique({ where: { id: other.id } })
    expect(stillThere?.name).toBe('Their Card')
  })

  it('DELETE on another user\'s debt returns 404 and leaves it in the DB', async () => {
    const other = await db.debt.create({
      data: { userId: 'user_other', name: 'Their Loan', lender: 'Z', type: 'personal_loan', balance: 500, originalBalance: 500, apr: 10, minimumPayment: 25, dueDay: 1 },
    })
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ id: other.id }) })
    expect(res.status).toBe(404)
    const stillThere = await db.debt.findUnique({ where: { id: other.id } })
    expect(stillThere).not.toBeNull()
  })

  it('PATCH on own debt updates it', async () => {
    const mine = await db.debt.create({
      data: { userId: 'user_test', name: 'Mine', lender: 'Z', type: 'credit_card', balance: 500, originalBalance: 500, apr: 20, minimumPayment: 25, dueDay: 1 },
    })
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ balance: 400 }) })
    const res = await PATCH(req, { params: Promise.resolve({ id: mine.id }) })
    expect(res.status).toBe(200)
    const updated = await db.debt.findUnique({ where: { id: mine.id } })
    expect(Number(updated?.balance)).toBe(400)
  })

  it('DELETE on own debt removes it', async () => {
    const mine = await db.debt.create({
      data: { userId: 'user_test', name: 'ToDelete', lender: 'Z', type: 'credit_card', balance: 500, originalBalance: 500, apr: 20, minimumPayment: 25, dueDay: 1 },
    })
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ id: mine.id }) })
    expect(res.status).toBe(200)
    const gone = await db.debt.findUnique({ where: { id: mine.id } })
    expect(gone).toBeNull()
  })
})

describe('POST /api/scenarios/payoff then GET', () => {
  it('round-trips a payoff scenario', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ name: 'Aggressive avalanche', strategy: 'avalanche', extraMonthly: 250, oneTimePayment: 1000, startMonth: '2026-08' }),
    })
    const res = await scenariosPOST(req)
    expect(res.status).toBe(201)
    const getRes = await scenariosGET()
    const body = await getRes.json()
    expect(body[0].name).toBe('Aggressive avalanche')
    expect(body[0].extraMonthly).toBe(250)
    expect(body[0].customOrder).toEqual([])
  })

  it('rejects a malformed startMonth with 400', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ name: 'Bad', strategy: 'snowball', extraMonthly: 0, oneTimePayment: 0, startMonth: 'not-a-month' }),
    })
    const res = await scenariosPOST(req)
    expect(res.status).toBe(400)
  })
})

describe('POST /api/scenarios/payoff — Free plan cap', () => {
  const scenario = (name: string) => new Request('http://x', {
    method: 'POST',
    body: JSON.stringify({ name, strategy: 'avalanche', extraMonthly: 0, oneTimePayment: 0, startMonth: '2026-08' }),
  })

  it('allows the first saved scenario on Free', async () => {
    currentPlan = 'free'
    const res = await scenariosPOST(scenario('First plan'))
    expect(res.status).toBe(201)
  })

  it('rejects a second saved scenario on Free with 403 upgrade_required', async () => {
    currentPlan = 'free'
    const first = await scenariosPOST(scenario('First plan'))
    expect(first.status).toBe(201)

    const second = await scenariosPOST(scenario('Second plan'))
    expect(second.status).toBe(403)
    const body = await second.json()
    expect(body.error).toBe('upgrade_required')

    const count = await db.payoffScenario.count({ where: { userId: 'user_test' } })
    expect(count).toBe(1)
  })

  it('allows a second saved scenario on Pro', async () => {
    currentPlan = 'pro'
    const first = await scenariosPOST(scenario('First plan'))
    expect(first.status).toBe(201)
    const second = await scenariosPOST(scenario('Second plan'))
    expect(second.status).toBe(201)
  })
})

describe('GET /api/scenarios/payoff', () => {
  it('never returns another user\'s scenarios', async () => {
    await db.payoffScenario.create({
      data: { userId: 'user_other', name: 'Secret plan', strategy: 'snowball', extraMonthly: 0, oneTimePayment: 0, startMonth: '2026-01', customOrder: [] },
    })
    const res = await scenariosGET()
    const body = await res.json()
    expect(body.every((s: { name: string }) => s.name !== 'Secret plan')).toBe(true)
  })
})

describe('payoff-scenarios cross-user ownership boundary', () => {
  it('PATCH on another user\'s scenario returns 404 and leaves it unchanged', async () => {
    const other = await db.payoffScenario.create({
      data: { userId: 'user_other', name: 'Their plan', strategy: 'snowball', extraMonthly: 0, oneTimePayment: 0, startMonth: '2026-01', customOrder: [] },
    })
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ name: 'Hacked' }) })
    const res = await scenarioPATCH(req, { params: Promise.resolve({ id: other.id }) })
    expect(res.status).toBe(404)
    const stillThere = await db.payoffScenario.findUnique({ where: { id: other.id } })
    expect(stillThere?.name).toBe('Their plan')
  })

  it('DELETE on another user\'s scenario returns 404 and leaves it in the DB', async () => {
    const other = await db.payoffScenario.create({
      data: { userId: 'user_other', name: 'Their plan', strategy: 'snowball', extraMonthly: 0, oneTimePayment: 0, startMonth: '2026-01', customOrder: [] },
    })
    const res = await scenarioDELETE(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ id: other.id }) })
    expect(res.status).toBe(404)
    const stillThere = await db.payoffScenario.findUnique({ where: { id: other.id } })
    expect(stillThere).not.toBeNull()
  })

  it('PATCH on own scenario updates it', async () => {
    const mine = await db.payoffScenario.create({
      data: { userId: 'user_test', name: 'Mine', strategy: 'snowball', extraMonthly: 0, oneTimePayment: 0, startMonth: '2026-01', customOrder: [] },
    })
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ extraMonthly: 300 }) })
    const res = await scenarioPATCH(req, { params: Promise.resolve({ id: mine.id }) })
    expect(res.status).toBe(200)
    const updated = await db.payoffScenario.findUnique({ where: { id: mine.id } })
    expect(Number(updated?.extraMonthly)).toBe(300)
  })

  it('DELETE on own scenario removes it', async () => {
    const mine = await db.payoffScenario.create({
      data: { userId: 'user_test', name: 'ToDelete', strategy: 'snowball', extraMonthly: 0, oneTimePayment: 0, startMonth: '2026-01', customOrder: [] },
    })
    const res = await scenarioDELETE(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ id: mine.id }) })
    expect(res.status).toBe(200)
    const gone = await db.payoffScenario.findUnique({ where: { id: mine.id } })
    expect(gone).toBeNull()
  })
})
