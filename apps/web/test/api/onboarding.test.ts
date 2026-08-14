import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST as createAccount } from '@/app/api/accounts/route'
import { GET as meGET, PATCH as mePATCH } from '@/app/api/me/route'
import { markOnboardingStep } from '@/lib/onboarding'
import { db } from '@/lib/db'

let currentUserId = 'user_onboarding_test'
vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: currentUserId, plan: 'pro' })) }))

beforeEach(async () => {
  currentUserId = 'user_onboarding_test'
  await db.user.upsert({
    where: { id: 'user_onboarding_test' },
    update: { onboardingSteps: {}, onboardingDismissed: false },
    create: { id: 'user_onboarding_test', email: 'onboarding@example.com' },
  })
  await db.user.upsert({ where: { id: 'user_onboarding_other' }, update: {}, create: { id: 'user_onboarding_other', email: 'onboarding-other@example.com' } })
  await db.financialAccount.deleteMany({ where: { userId: { in: ['user_onboarding_test', 'user_onboarding_other'] } } })
})

describe('markOnboardingStep', () => {
  it('flips a step to true and is idempotent', async () => {
    await markOnboardingStep('user_onboarding_test', 'account')
    let user = await db.user.findUniqueOrThrow({ where: { id: 'user_onboarding_test' } })
    expect(user.onboardingSteps).toEqual({ account: true })

    await markOnboardingStep('user_onboarding_test', 'account')
    user = await db.user.findUniqueOrThrow({ where: { id: 'user_onboarding_test' } })
    expect(user.onboardingSteps).toEqual({ account: true })
  })

  it('preserves previously-set steps when setting a new one', async () => {
    await markOnboardingStep('user_onboarding_test', 'account')
    await markOnboardingStep('user_onboarding_test', 'budget')
    const user = await db.user.findUniqueOrThrow({ where: { id: 'user_onboarding_test' } })
    expect(user.onboardingSteps).toEqual({ account: true, budget: true })
  })
})

describe('POST /api/accounts', () => {
  it('marks the account onboarding step on creation', async () => {
    const res = await createAccount(new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ name: 'Checking', institution: 'Chase', type: 'checking', balance: 100 }),
    }))
    expect(res.status).toBe(201)
    const user = await db.user.findUniqueOrThrow({ where: { id: 'user_onboarding_test' } })
    expect((user.onboardingSteps as Record<string, boolean>).account).toBe(true)
  })
})

describe('GET /api/me', () => {
  it('exposes onboarding progress scoped to the caller', async () => {
    await markOnboardingStep('user_onboarding_test', 'account')
    const res = await meGET()
    const body = await res.json()
    expect(body.onboardingSteps).toEqual({ account: true })
    expect(body.onboardingDismissed).toBe(false)
  })
})

describe('PATCH /api/me', () => {
  it('persists onboardingDismissed', async () => {
    const res = await mePATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ onboardingDismissed: true }) }))
    expect(res.status).toBe(200)
    const user = await db.user.findUniqueOrThrow({ where: { id: 'user_onboarding_test' } })
    expect(user.onboardingDismissed).toBe(true)
  })

  it('marks the digest onboarding step when weeklyDigestEnabled is set', async () => {
    const res = await mePATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ weeklyDigestEnabled: true }) }))
    expect(res.status).toBe(200)
    const user = await db.user.findUniqueOrThrow({ where: { id: 'user_onboarding_test' } })
    expect((user.onboardingSteps as Record<string, boolean>).digest).toBe(true)
  })
})
