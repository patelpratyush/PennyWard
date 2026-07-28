import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/imports/csv/route'
import { db } from '@/lib/db'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: 'user_test' })) }))

let accountId: string

beforeEach(async () => {
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'imp@example.com' } })
  await db.transaction.deleteMany({ where: { userId: 'user_test' } })
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
})
