import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/categories/route'
import { PATCH } from '@/app/api/categories/[id]/route'
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

describe('PATCH /api/categories/[id]', () => {
  it('rejects updating a system default category (userId: null) with 404', async () => {
    const system = await db.category.create({ data: { userId: null, name: 'System Cat', group: 'Lifestyle', icon: 'star', color: 'chart-1' } })
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ archived: true }) })
    const res = await PATCH(req, { params: Promise.resolve({ id: system.id }) })
    expect(res.status).toBe(404)
    await db.category.delete({ where: { id: system.id } })
  })

  it('rejects updating another user\'s category with 404', async () => {
    await db.user.upsert({ where: { id: 'user_other' }, update: {}, create: { id: 'user_other', email: 'other@example.com' } })
    const other = await db.category.create({ data: { userId: 'user_other', name: 'Other User Cat', group: 'Lifestyle', icon: 'star', color: 'chart-1' } })
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ archived: true }) })
    const res = await PATCH(req, { params: Promise.resolve({ id: other.id }) })
    expect(res.status).toBe(404)
    await db.category.delete({ where: { id: other.id } })
  })

  it('allows updating the current user\'s own category', async () => {
    const own = await db.category.create({ data: { userId: 'user_test', name: 'My Cat', group: 'Lifestyle', icon: 'star', color: 'chart-1' } })
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ archived: true }) })
    const res = await PATCH(req, { params: Promise.resolve({ id: own.id }) })
    expect(res.status).toBe(200)
    const updated = await db.category.findUnique({ where: { id: own.id } })
    expect(updated?.archived).toBe(true)
  })
})
