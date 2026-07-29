import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '@/lib/db'

let currentUserId = 'user_a'
vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: currentUserId })) }))

import { GET as getAccounts } from '@/app/api/accounts/route'
import { GET as getTransactions, POST as createTransaction } from '@/app/api/transactions/route'
import { GET as getDebts } from '@/app/api/debts/route'
import { PATCH as patchAccount } from '@/app/api/accounts/[id]/route'

beforeEach(async () => {
  await db.user.upsert({ where: { id: 'user_a' }, update: {}, create: { id: 'user_a', email: 'a@example.com' } })
  await db.user.upsert({ where: { id: 'user_b' }, update: {}, create: { id: 'user_b', email: 'b@example.com' } })
})

describe('cross-user data isolation', () => {
  it('user A cannot see user B\'s accounts', async () => {
    await db.financialAccount.create({ data: { userId: 'user_b', name: 'B Secret', institution: 'X', type: 'checking', balance: 1 } })
    currentUserId = 'user_a'
    const res = await getAccounts()
    const body = await res.json()
    expect(body.some((a: { name: string }) => a.name === 'B Secret')).toBe(false)
  })

  it('user A cannot PATCH user B\'s account', async () => {
    const bAccount = await db.financialAccount.create({ data: { userId: 'user_b', name: 'B Account', institution: 'X', type: 'checking', balance: 1 } })
    currentUserId = 'user_a'
    const res = await patchAccount(
      new Request('http://x', { method: 'PATCH', body: JSON.stringify({ name: 'Hacked' }) }),
      { params: Promise.resolve({ id: bAccount.id }) },
    )
    expect(res.status).toBe(404)
    const stillOriginal = await db.financialAccount.findUnique({ where: { id: bAccount.id } })
    expect(stillOriginal?.name).toBe('B Account')
  })

  it('user A cannot see user B\'s transactions', async () => {
    const bAcc = await db.financialAccount.create({ data: { userId: 'user_b', name: 'X', institution: 'X', type: 'checking', balance: 0 } })
    await db.transaction.create({ data: { userId: 'user_b', accountId: bAcc.id, type: 'expense', amount: 5, merchant: 'Secret Purchase', date: new Date() } })
    currentUserId = 'user_a'
    const res = await getTransactions(new Request('http://x/api/transactions'))
    const body = await res.json()
    expect(body.items.some((t: { merchant: string }) => t.merchant === 'Secret Purchase')).toBe(false)
  })

  it('user A cannot see user B\'s debts', async () => {
    await db.debt.create({ data: { userId: 'user_b', name: 'B Debt', lender: 'X', type: 'other', balance: 100, originalBalance: 100, apr: 5, minimumPayment: 10, dueDay: 1 } })
    currentUserId = 'user_a'
    const res = await getDebts()
    const body = await res.json()
    expect(body.some((d: { name: string }) => d.name === 'B Debt')).toBe(false)
  })

  it('user A cannot create a transaction referencing user B\'s category', async () => {
    currentUserId = 'user_a'
    const aAccount = await db.financialAccount.create({ data: { userId: 'user_a', name: 'A Checking', institution: 'X', type: 'checking', balance: 100 } })
    const bCategory = await db.category.create({ data: { userId: 'user_b', name: 'B Only Category', group: 'Lifestyle', icon: 'shopping-bag', color: 'chart-1' } })

    const res = await createTransaction(
      new Request('http://x', {
        method: 'POST',
        body: JSON.stringify({
          accountId: aAccount.id,
          categoryId: bCategory.id,
          type: 'expense',
          amount: 12.5,
          merchant: 'Test Merchant',
          date: '2026-01-01',
        }),
      }),
    )
    expect(res.status).toBe(404)
    const count = await db.transaction.count({ where: { accountId: aAccount.id } })
    expect(count).toBe(0)
  })
})
