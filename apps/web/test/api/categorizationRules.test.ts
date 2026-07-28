import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/categorization-rules/route'
import { db } from '@/lib/db'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: 'user_test' })) }))

let categoryId: string

beforeEach(async () => {
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'rules@example.com' } })
  await db.categorizationRule.deleteMany({ where: { userId: 'user_test' } })
  const cat = await db.category.findFirstOrThrow({ where: { userId: null } })
  categoryId = cat.id
})

describe('POST /api/categorization-rules', () => {
  it('creates a rule for the current user', async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ matchType: 'contains', pattern: 'starbucks', categoryId }) })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})

describe('GET /api/categorization-rules', () => {
  it('lists rules ordered by priority descending', async () => {
    await db.categorizationRule.create({ data: { userId: 'user_test', matchType: 'contains', pattern: 'a', categoryId, priority: 1 } })
    await db.categorizationRule.create({ data: { userId: 'user_test', matchType: 'contains', pattern: 'b', categoryId, priority: 5 } })
    const res = await GET()
    const body = await res.json()
    expect(body[0].pattern).toBe('b')
  })
})
