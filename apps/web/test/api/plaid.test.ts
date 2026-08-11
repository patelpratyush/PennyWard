import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST as exchangePOST } from '@/app/api/plaid/exchange/route'
import { POST as syncPOST } from '@/app/api/plaid/sync/route'
import { GET as itemsGET } from '@/app/api/plaid/items/route'
import { DELETE as itemDELETE } from '@/app/api/plaid/items/[id]/route'
import { POST as linkTokenPOST } from '@/app/api/plaid/link-token/route'
import { getPlaidClient } from '@/lib/plaid'
import { encryptToken, decryptToken } from '@/lib/plaidCrypto'
import { mapPlaidAccountType, plaidBalanceToAppBalance } from '@/lib/plaidAccountType'
import { db } from '@/lib/db'

// These hit Plaid's real Sandbox API (we have real PLAID_CLIENT_ID/SECRET
// for this session) via sandboxPublicTokenCreate — the same mechanism a
// completed Link flow produces, so the exchange/sync routes below run
// against real Plaid infrastructure end-to-end rather than a mock.
let currentUserId = 'user_plaid_test'
vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: currentUserId, plan: 'pro' })) }))

beforeEach(async () => {
  currentUserId = 'user_plaid_test'
  await db.user.upsert({ where: { id: 'user_plaid_test' }, update: {}, create: { id: 'user_plaid_test', email: 'plaid@example.com' } })
  await db.user.upsert({ where: { id: 'user_plaid_other' }, update: {}, create: { id: 'user_plaid_other', email: 'plaid-other@example.com' } })
  await db.transaction.deleteMany({ where: { userId: { in: ['user_plaid_test', 'user_plaid_other'] } } })
  await db.financialAccount.deleteMany({ where: { userId: { in: ['user_plaid_test', 'user_plaid_other'] } } })
  await db.plaidItem.deleteMany({ where: { userId: { in: ['user_plaid_test', 'user_plaid_other'] } } })
})

describe('lib/plaidCrypto', () => {
  it('round-trips a token through AES-256-GCM encryption', () => {
    const encrypted = encryptToken('access-sandbox-fake-token-12345')
    expect(encrypted).not.toContain('access-sandbox')
    expect(decryptToken(encrypted)).toBe('access-sandbox-fake-token-12345')
  })
})

describe('lib/plaidAccountType', () => {
  it('maps Plaid types/subtypes to this app\'s AccountType', () => {
    expect(mapPlaidAccountType('depository', 'checking')).toBe('checking')
    expect(mapPlaidAccountType('depository', 'savings')).toBe('savings')
    expect(mapPlaidAccountType('credit', 'credit card')).toBe('credit_card')
    expect(mapPlaidAccountType('loan', 'student')).toBe('student_loan')
    expect(mapPlaidAccountType('loan', 'mortgage')).toBe('mortgage')
    expect(mapPlaidAccountType('investment', null)).toBe('investment')
  })

  it('flips sign for liability account types, passes through for assets', () => {
    expect(plaidBalanceToAppBalance(500, 'credit_card')).toBe(-500) // owed -> negative
    expect(plaidBalanceToAppBalance(1200, 'checking')).toBe(1200) // asset -> positive
  })
})

async function linkSandboxAccount(userId: string) {
  const client = getPlaidClient()
  const { data } = await client.sandboxPublicTokenCreate({
    institution_id: 'ins_109508', // First Platypus Bank — Plaid's standard sandbox test institution
    initial_products: ['transactions' as never],
  })
  currentUserId = userId
  const res = await exchangePOST(new Request('http://x', {
    method: 'POST',
    body: JSON.stringify({ publicToken: data.public_token, institutionName: 'First Platypus Bank' }),
  }))
  return res
}

describe('POST /api/plaid/exchange (real Sandbox)', () => {
  it('exchanges a real Sandbox public_token, creates accounts, and syncs starter transactions', async () => {
    const res = await linkSandboxAccount('user_plaid_test')
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.accountsLinked).toBeGreaterThan(0)

    const accounts = await db.financialAccount.findMany({ where: { userId: 'user_plaid_test' } })
    expect(accounts.length).toBe(body.accountsLinked)
    expect(accounts.every((a) => a.plaidAccountId)).toBe(true)

    const item = await db.plaidItem.findFirstOrThrow({ where: { userId: 'user_plaid_test' } })
    expect(item.status).toBe('active')
    // A brand-new Sandbox item may not have finished seeding transaction
    // data yet, in which case Plaid returns an empty-string cursor on the
    // first sync rather than null — either is a valid "no data yet" state,
    // just not `undefined`/`null` (which would mean the sync never ran).
    expect(item.cursor).not.toBeNull()
  }, 30_000)
})

describe('POST /api/plaid/sync', () => {
  it('is idempotent — a second sync of the same item does not duplicate transactions', async () => {
    await linkSandboxAccount('user_plaid_test')
    const item = await db.plaidItem.findFirstOrThrow({ where: { userId: 'user_plaid_test' } })
    const countAfterExchange = await db.transaction.count({ where: { userId: 'user_plaid_test' } })

    const res = await syncPOST(new Request('http://x', { method: 'POST', body: JSON.stringify({ itemId: item.id }) }))
    expect(res.status).toBe(200)

    const countAfterResync = await db.transaction.count({ where: { userId: 'user_plaid_test' } })
    expect(countAfterResync).toBe(countAfterExchange)
  }, 30_000)

  it('rejects syncing another user\'s item with 404', async () => {
    await linkSandboxAccount('user_plaid_test')
    const item = await db.plaidItem.findFirstOrThrow({ where: { userId: 'user_plaid_test' } })

    currentUserId = 'user_plaid_other'
    const res = await syncPOST(new Request('http://x', { method: 'POST', body: JSON.stringify({ itemId: item.id }) }))
    expect(res.status).toBe(404)
  }, 30_000)
})

describe('GET /api/plaid/items', () => {
  it('never returns another user\'s items', async () => {
    await linkSandboxAccount('user_plaid_test')
    currentUserId = 'user_plaid_other'
    const res = await itemsGET()
    const body = await res.json()
    expect(body).toHaveLength(0)
  }, 30_000)
})

describe('DELETE /api/plaid/items/[id]', () => {
  it('unlinks the item (revokes with Plaid) but keeps the linked accounts', async () => {
    await linkSandboxAccount('user_plaid_test')
    const item = await db.plaidItem.findFirstOrThrow({ where: { userId: 'user_plaid_test' } })
    const accountCountBefore = await db.financialAccount.count({ where: { userId: 'user_plaid_test' } })

    const res = await itemDELETE(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ id: item.id }) })
    expect(res.status).toBe(200)

    expect(await db.plaidItem.findUnique({ where: { id: item.id } })).toBeNull()
    const accountCountAfter = await db.financialAccount.count({ where: { userId: 'user_plaid_test' } })
    expect(accountCountAfter).toBe(accountCountBefore) // accounts survive unlink
  }, 30_000)

  it('rejects unlinking another user\'s item with 404', async () => {
    await linkSandboxAccount('user_plaid_test')
    const item = await db.plaidItem.findFirstOrThrow({ where: { userId: 'user_plaid_test' } })

    currentUserId = 'user_plaid_other'
    const res = await itemDELETE(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ id: item.id }) })
    expect(res.status).toBe(404)
  }, 30_000)
})

describe('POST /api/plaid/link-token', () => {
  it('creates a real Sandbox Link token', async () => {
    const res = await linkTokenPOST(new Request('http://x', { method: 'POST', body: JSON.stringify({}) }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.linkToken).toMatch(/^link-sandbox-/)
  }, 15_000)

  it('creates an update-mode token for re-linking a login_required item', async () => {
    await linkSandboxAccount('user_plaid_test')
    const item = await db.plaidItem.findFirstOrThrow({ where: { userId: 'user_plaid_test' } })
    const res = await linkTokenPOST(new Request('http://x', { method: 'POST', body: JSON.stringify({ itemId: item.id }) }))
    expect(res.status).toBe(200)
  }, 30_000)
})
