import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/import-mappings/route'
import { db } from '@/lib/db'

let currentUserId = 'user_test'
vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: currentUserId, plan: 'pro' })) }))

beforeEach(async () => {
  currentUserId = 'user_test'
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'mapping@example.com' } })
  await db.user.upsert({ where: { id: 'user_other' }, update: {}, create: { id: 'user_other', email: 'mapping-other@example.com' } })
  await db.importMapping.deleteMany({ where: { userId: { in: ['user_test', 'user_other'] } } })
})

describe('GET /api/import-mappings', () => {
  it('returns null when no mapping is saved for the institution', async () => {
    const res = await GET(new Request('http://x?institution=Chase'))
    const body = await res.json()
    expect(body).toBeNull()
  })

  it('rejects a missing institution param with 400', async () => {
    const res = await GET(new Request('http://x'))
    expect(res.status).toBe(400)
  })

  it('never returns another user\'s mapping', async () => {
    await db.importMapping.create({ data: { userId: 'user_other', institution: 'Chase', mapping: { date: 'Date' } } })
    const res = await GET(new Request('http://x?institution=Chase'))
    const body = await res.json()
    expect(body).toBeNull()
  })
})

describe('POST /api/import-mappings', () => {
  it('saves a mapping and GET returns it', async () => {
    const postRes = await POST(new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ institution: 'Chase', mapping: { date: 'Date', amount: 'Amount', merchant: 'Description' } }),
    }))
    expect(postRes.status).toBe(200)

    const getRes = await GET(new Request('http://x?institution=Chase'))
    const body = await getRes.json()
    expect(body.mapping).toEqual({ date: 'Date', amount: 'Amount', merchant: 'Description' })
  })

  it('upserts (updates, not duplicates) on a second save for the same institution', async () => {
    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ institution: 'Chase', mapping: { date: 'Date' } }) }))
    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ institution: 'Chase', mapping: { date: 'Transaction Date' } }) }))

    const count = await db.importMapping.count({ where: { userId: 'user_test', institution: 'Chase' } })
    expect(count).toBe(1)
    const getRes = await GET(new Request('http://x?institution=Chase'))
    const body = await getRes.json()
    expect(body.mapping.date).toBe('Transaction Date')
  })

  it('rejects a malformed body with 400', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ institution: '', mapping: {} }) }))
    expect(res.status).toBe(400)
  })
})
