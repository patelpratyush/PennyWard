import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/categorization-rules/route'
import { PATCH, DELETE } from '@/app/api/categorization-rules/[id]/route'
import { db } from '@/lib/db'

let currentUserId = 'user_test'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: currentUserId })) }))

let categoryId: string
let otherRuleId: string

beforeEach(async () => {
  currentUserId = 'user_test'
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'rules@example.com' } })
  await db.user.upsert({ where: { id: 'user_other' }, update: {}, create: { id: 'user_other', email: 'rules-other@example.com' } })
  await db.categorizationRule.deleteMany({ where: { userId: { in: ['user_test', 'user_other'] } } })
  const cat = await db.category.findFirstOrThrow({ where: { userId: null } })
  categoryId = cat.id
  const otherRule = await db.categorizationRule.create({
    data: { userId: 'user_other', matchType: 'contains', pattern: 'other-pattern', categoryId, priority: 2 },
  })
  otherRuleId = otherRule.id
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

describe('cross-user ownership boundary', () => {
  it('PATCH on the current user\'s own rule updates it', async () => {
    const rule = await db.categorizationRule.create({
      data: { userId: 'user_test', matchType: 'contains', pattern: 'mine', categoryId, priority: 1 },
    })
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ pattern: 'updated-pattern' }) })
    const res = await PATCH(req, { params: Promise.resolve({ id: rule.id }) })
    expect(res.status).toBe(200)
    const updated = await db.categorizationRule.findUnique({ where: { id: rule.id } })
    expect(updated?.pattern).toBe('updated-pattern')
  })

  it('PATCH on another user\'s rule returns 404 and leaves it unchanged', async () => {
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ pattern: 'hacked' }) })
    const res = await PATCH(req, { params: Promise.resolve({ id: otherRuleId }) })
    expect(res.status).toBe(404)
    const stillThere = await db.categorizationRule.findUnique({ where: { id: otherRuleId } })
    expect(stillThere).not.toBeNull()
    expect(stillThere?.pattern).toBe('other-pattern')
  })

  it('DELETE on another user\'s rule returns 404 and leaves it in the DB', async () => {
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ id: otherRuleId }) })
    expect(res.status).toBe(404)
    const stillThere = await db.categorizationRule.findUnique({ where: { id: otherRuleId } })
    expect(stillThere).not.toBeNull()
  })

  it('DELETE on the current user\'s own rule removes it', async () => {
    const rule = await db.categorizationRule.create({
      data: { userId: 'user_test', matchType: 'contains', pattern: 'to-delete', categoryId, priority: 1 },
    })
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ id: rule.id }) })
    expect(res.status).toBe(200)
    const gone = await db.categorizationRule.findUnique({ where: { id: rule.id } })
    expect(gone).toBeNull()
  })
})
