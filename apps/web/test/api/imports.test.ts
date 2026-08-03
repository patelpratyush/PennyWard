import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/imports/csv/route'
import { db } from '@/lib/db'

// Defaults to 'pro' so the existing import tests below (which predate plan
// gating) aren't incidentally blocked by CSV import being a Free-tier-only
// feature. The block itself is exercised explicitly further down.
let currentPlan: 'free' | 'pro' | 'household' = 'pro'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: 'user_test', plan: currentPlan })) }))
// checkRateLimit hits a real Upstash instance (see lib/rateLimit.ts) — this
// suite runs enough imports per pass to exhaust the real 20/hour quota after
// a couple of repeated runs, failing later tests with an unrelated 429.
vi.mock('@/lib/rateLimit', () => ({ importRateLimit: {}, checkRateLimit: vi.fn(async () => true) }))

let accountId: string

beforeEach(async () => {
  currentPlan = 'pro'
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'imp@example.com' } })
  await db.transaction.deleteMany({ where: { userId: 'user_test' } })
  await db.categorizationRule.deleteMany({ where: { userId: 'user_test' } })
  await db.financialAccount.deleteMany({ where: { userId: 'user_test' } })
  const acc = await db.financialAccount.create({ data: { userId: 'user_test', name: 'Chase', institution: 'Chase', type: 'checking', balance: 0 } })
  accountId = acc.id
})

const rows = [
  { Date: '07/01/2026', Description: 'STARBUCKS STORE 123', Amount: '-5.75' },
  { Date: '07/02/2026', Description: 'PAYROLL DEPOSIT', Amount: '2000.00' },
]
const mapping = { date: 'Date', amount: 'Amount', payee: 'Description' }

describe('POST /api/imports/csv', () => {
  it('imports new rows and reports zero duplicates on first pass', async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ accountId, rows, mapping, dateFormat: 'MM/dd/yyyy' }) })
    const res = await POST(req)
    const body = await res.json()
    expect(body.imported).toBe(2)
    expect(body.duplicates).toBe(0)
  })

  it('flags exact re-import as duplicates, not silently re-inserted', async () => {
    const req1 = new Request('http://x', { method: 'POST', body: JSON.stringify({ accountId, rows, mapping, dateFormat: 'MM/dd/yyyy' }) })
    await POST(req1)
    const req2 = new Request('http://x', { method: 'POST', body: JSON.stringify({ accountId, rows, mapping, dateFormat: 'MM/dd/yyyy' }) })
    const res2 = await POST(req2)
    const body2 = await res2.json()
    expect(body2.imported).toBe(0)
    expect(body2.duplicates).toBe(2)
  })

  it('skips unparseable amounts (formatted or garbage) into the review list instead of 500ing mid-import', async () => {
    const messyRows = [
      { Date: '07/01/2026', Description: 'GOOD ROW', Amount: '-5.75' },
      { Date: '07/03/2026', Description: 'COMMA FORMATTED', Amount: '$1,234.56' },
      { Date: '07/04/2026', Description: 'PAREN NEGATIVE', Amount: '(45.00)' },
      { Date: '07/05/2026', Description: 'GARBAGE', Amount: '--' },
    ]
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ accountId, rows: messyRows, mapping, dateFormat: 'MM/dd/yyyy' }) })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.imported).toBe(3)
    expect(body.review).toHaveLength(1)
    expect(body.review[0]).toContain('--')
  })

  it('a malformed regex rule is skipped (no category match) instead of 500ing the import', async () => {
    const category = await db.category.findFirstOrThrow({ where: { userId: null } })
    await db.categorizationRule.create({ data: { userId: 'user_test', matchType: 'contains', pattern: 'placeholder', categoryId: category.id, priority: 0 } })
    // Simulates a legacy bad row saved before pattern validation existed —
    // bypasses createRuleSchema by writing directly to the DB.
    await db.$executeRawUnsafe(
      `UPDATE "CategorizationRule" SET "matchType" = 'regex', "pattern" = '[' WHERE "userId" = 'user_test'`,
    )
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ accountId, rows, mapping, dateFormat: 'MM/dd/yyyy' }) })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.imported).toBe(2)
  })
})

describe('POST /api/imports/csv — Free plan block', () => {
  it('rejects the import entirely on Free with 403 upgrade_required', async () => {
    currentPlan = 'free'
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ accountId, rows, mapping, dateFormat: 'MM/dd/yyyy' }) })
    const res = await POST(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('upgrade_required')

    const count = await db.transaction.count({ where: { userId: 'user_test' } })
    expect(count).toBe(0)
  })

  it('allows the import on Pro', async () => {
    currentPlan = 'pro'
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ accountId, rows, mapping, dateFormat: 'MM/dd/yyyy' }) })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})
