import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/household/route'
import { POST as inviteCreate } from '@/app/api/household/invites/route'
import { POST as inviteAccept } from '@/app/api/household/invites/[token]/route'
import { DELETE as memberRemove } from '@/app/api/household/members/[userId]/route'
import { db } from '@/lib/db'

let currentUserId = 'owner_user'
let currentPlan: 'free' | 'pro' | 'household' = 'household'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: currentUserId, plan: currentPlan })) }))

beforeEach(async () => {
  currentUserId = 'owner_user'
  currentPlan = 'household'
  await db.user.upsert({ where: { id: 'owner_user' }, update: {}, create: { id: 'owner_user', email: 'owner@example.com' } })
  await db.user.upsert({ where: { id: 'member_user' }, update: {}, create: { id: 'member_user', email: 'member@example.com' } })
  await db.user.upsert({ where: { id: 'outsider_user' }, update: {}, create: { id: 'outsider_user', email: 'outsider@example.com' } })
  await db.householdMember.deleteMany({ where: { userId: { in: ['owner_user', 'member_user', 'outsider_user'] } } })
  await db.household.deleteMany({ where: { ownerId: 'owner_user' } })
})

describe('POST /api/household', () => {
  it('rejects creation on a non-Household plan with 403 upgrade_required', async () => {
    currentPlan = 'pro'
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Home' }) }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('upgrade_required')
  })

  it('creates a household and makes the caller its owner', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Home' }) }))
    expect(res.status).toBe(201)
    const getRes = await GET()
    const body = await getRes.json()
    expect(body.name).toBe('Home')
    expect(body.role).toBe('owner')
    expect(body.members).toHaveLength(1)
  })

  it('rejects creating a second household for the same user', async () => {
    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Home' }) }))
    const second = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Home 2' }) }))
    expect(second.status).toBe(409)
  })
})

describe('household invites', () => {
  it('rejects invite creation by a non-owner member', async () => {
    const created = await (await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Home' }) }))).json()
    await db.householdMember.create({ data: { householdId: created.id, userId: 'member_user', role: 'member' } })

    currentUserId = 'member_user'
    const res = await inviteCreate(new Request('http://x', { method: 'POST', body: JSON.stringify({ email: 'new@example.com' }) }))
    expect(res.status).toBe(403)
  })

  it('accepts a valid invite and adds the invitee as a member', async () => {
    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Home' }) }))
    const invite = await (await inviteCreate(new Request('http://x', { method: 'POST', body: JSON.stringify({ email: 'member@example.com' }) }))).json()

    currentUserId = 'member_user'
    const res = await inviteAccept(new Request('http://x', { method: 'POST' }), { params: Promise.resolve({ token: invite.token }) })
    expect(res.status).toBe(200)

    currentUserId = 'owner_user'
    const householdBody = await (await GET()).json()
    expect(householdBody.members.map((m: { userId: string }) => m.userId)).toContain('member_user')
  })

  it('rejects acceptance by a user whose email does not match the invite', async () => {
    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Home' }) }))
    const invite = await (await inviteCreate(new Request('http://x', { method: 'POST', body: JSON.stringify({ email: 'new@example.com' }) }))).json()

    currentUserId = 'member_user'
    const res = await inviteAccept(new Request('http://x', { method: 'POST' }), { params: Promise.resolve({ token: invite.token }) })
    expect(res.status).toBe(403)
    const membership = await db.householdMember.findFirst({ where: { userId: 'member_user' } })
    expect(membership).toBeNull()
  })

  it('rejects invite creation once the owner has been downgraded off the Household plan', async () => {
    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Home' }) }))
    currentPlan = 'pro'
    const res = await inviteCreate(new Request('http://x', { method: 'POST', body: JSON.stringify({ email: 'new@example.com' }) }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('upgrade_required')
  })

  it('rejects an already-accepted invite on a second accept attempt', async () => {
    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Home' }) }))
    const invite = await (await inviteCreate(new Request('http://x', { method: 'POST', body: JSON.stringify({ email: 'member@example.com' }) }))).json()

    currentUserId = 'member_user'
    await inviteAccept(new Request('http://x', { method: 'POST' }), { params: Promise.resolve({ token: invite.token }) })

    currentUserId = 'outsider_user'
    const res = await inviteAccept(new Request('http://x', { method: 'POST' }), { params: Promise.resolve({ token: invite.token }) })
    expect(res.status).toBe(410)
  })

  it('rejects an expired invite', async () => {
    const created = await (await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Home' }) }))).json()
    const invite = await db.householdInvite.create({
      data: { householdId: created.id, email: 'late@example.com', token: 'expired-token', invitedByUserId: 'owner_user', expiresAt: new Date(Date.now() - 1000) },
    })
    currentUserId = 'outsider_user'
    const res = await inviteAccept(new Request('http://x', { method: 'POST' }), { params: Promise.resolve({ token: invite.token }) })
    expect(res.status).toBe(410)
  })
})

describe('household member removal', () => {
  it('owner can remove a member', async () => {
    const created = await (await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Home' }) }))).json()
    await db.householdMember.create({ data: { householdId: created.id, userId: 'member_user', role: 'member' } })

    const res = await memberRemove(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ userId: 'member_user' }) })
    expect(res.status).toBe(200)
    const stillThere = await db.householdMember.findFirst({ where: { householdId: created.id, userId: 'member_user' } })
    expect(stillThere).toBeNull()
  })

  it('a non-owner member cannot remove another member', async () => {
    const created = await (await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Home' }) }))).json()
    await db.householdMember.create({ data: { householdId: created.id, userId: 'member_user', role: 'member' } })
    await db.householdMember.create({ data: { householdId: created.id, userId: 'outsider_user', role: 'member' } })

    currentUserId = 'member_user'
    const res = await memberRemove(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ userId: 'outsider_user' }) })
    expect(res.status).toBe(403)
  })

  it('a member can remove themselves', async () => {
    const created = await (await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Home' }) }))).json()
    await db.householdMember.create({ data: { householdId: created.id, userId: 'member_user', role: 'member' } })

    currentUserId = 'member_user'
    const res = await memberRemove(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ userId: 'member_user' }) })
    expect(res.status).toBe(200)
  })
})
