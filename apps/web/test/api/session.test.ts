import { describe, it, expect, vi } from 'vitest'
import { getRequiredSession } from '@/lib/session'

vi.mock('@/auth', () => ({ auth: vi.fn(async () => null) }))

describe('getRequiredSession', () => {
  it('throws 401 Response when no session', async () => {
    await expect(getRequiredSession()).rejects.toBeInstanceOf(Response)
  })
})
