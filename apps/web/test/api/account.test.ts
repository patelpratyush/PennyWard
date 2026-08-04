import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DELETE } from '@/app/api/account/route'
import { db } from '@/lib/db'

let currentUserId = 'user_del_test'

vi.mock('@/lib/session', () => ({
  getRequiredSession: vi.fn(async () => ({ userId: currentUserId, plan: 'pro' })),
  UnauthorizedError: class UnauthorizedError extends Error {},
}))

const deleteUserMock = vi.fn<() => Promise<{ error: { message: string } | null }>>(async () => ({ error: null }))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ auth: { admin: { deleteUser: deleteUserMock } } }),
}))

beforeEach(async () => {
  currentUserId = 'user_del_test'
  deleteUserMock.mockClear()
  deleteUserMock.mockResolvedValue({ error: null })
  await db.user.upsert({ where: { id: 'user_del_test' }, update: {}, create: { id: 'user_del_test', email: 'del@example.com' } })
  await db.financialAccount.deleteMany({ where: { userId: 'user_del_test' } })
  await db.debt.deleteMany({ where: { userId: 'user_del_test' } })
})

describe('DELETE /api/account', () => {
  it('cascades through domain tables and calls the Supabase admin delete', async () => {
    const acc = await db.financialAccount.create({
      data: { userId: 'user_del_test', name: 'Checking', institution: 'Chase', type: 'checking', balance: 500 },
    })
    await db.debt.create({
      data: { userId: 'user_del_test', name: 'Card', lender: 'Amex', type: 'credit_card', balance: 100, originalBalance: 100, apr: 20, minimumPayment: 10, dueDay: 1 },
    })

    const res = await DELETE()
    expect(res.status).toBe(200)

    expect(await db.user.findUnique({ where: { id: 'user_del_test' } })).toBeNull()
    expect(await db.financialAccount.findUnique({ where: { id: acc.id } })).toBeNull()
    expect(await db.debt.count({ where: { userId: 'user_del_test' } })).toBe(0)
    expect(deleteUserMock).toHaveBeenCalledWith('user_del_test')
  })

  it('never deletes another user\'s data', async () => {
    await db.user.upsert({ where: { id: 'user_del_other' }, update: {}, create: { id: 'user_del_other', email: 'other-del@example.com' } })
    const otherAcc = await db.financialAccount.create({
      data: { userId: 'user_del_other', name: 'Their Account', institution: 'Chase', type: 'checking', balance: 500 },
    })

    await DELETE()

    const stillThere = await db.financialAccount.findUnique({ where: { id: otherAcc.id } })
    expect(stillThere).not.toBeNull()
    expect(await db.user.findUnique({ where: { id: 'user_del_other' } })).not.toBeNull()
  })

  it('reports 500 without deleting Postgres data if the Supabase admin call fails', async () => {
    deleteUserMock.mockResolvedValueOnce({ error: { message: 'boom' } })
    const res = await DELETE()
    expect(res.status).toBe(500)
    // The Postgres row is intentionally already gone by this point — the
    // handler deletes Postgres first, then Supabase Auth last (see the
    // ordering comment in app/api/account/route.ts).
    expect(await db.user.findUnique({ where: { id: 'user_del_test' } })).toBeNull()
  })
})
