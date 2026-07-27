import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/categories/route'
import { db } from '@/lib/db'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: 'user_test' })) }))

beforeEach(async () => {
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'cat@example.com' } })
  await db.category.deleteMany({ where: { userId: 'user_test' } })
})

describe('GET /api/categories', () => {
  it('includes system defaults and the user\'s own categories', async () => {
    await db.category.create({ data: { userId: 'user_test', name: 'Custom Hobby', group: 'Lifestyle', icon: 'star', color: 'chart-1' } })
    const res = await GET()
    const body = await res.json()
    expect(body.some((c: { name: string }) => c.name === 'Custom Hobby')).toBe(true)
    expect(body.some((c: { name: string }) => c.name === 'Groceries')).toBe(true) // seeded system default
  })
})

describe('POST /api/categories', () => {
  it('creates a category owned by the current user', async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Pets', group: 'Lifestyle', icon: 'dog', color: 'chart-2' }) })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
