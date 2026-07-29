import { describe, it, expect, vi } from 'vitest'
import { getRequiredSession, UnauthorizedError } from '@/lib/session'

vi.mock('@/auth', () => ({ auth: vi.fn(async () => null) }))

describe('getRequiredSession', () => {
  it('throws UnauthorizedError (not a Response) when no session', async () => {
    // Next.js route handlers only inspect *returned* Response objects — a
    // *thrown* Response becomes an uncaught exception and surfaces as a
    // generic 500. getRequiredSession must throw a plain Error subclass so
    // withAuthErrorHandling can catch it and produce a real 401.
    await expect(getRequiredSession()).rejects.toBeInstanceOf(UnauthorizedError)
    await expect(getRequiredSession()).rejects.not.toBeInstanceOf(Response)
  })
})

describe('withAuthErrorHandling (end-to-end via a real route handler)', () => {
  it('an unauthenticated request to GET /api/accounts returns a 401 Response, not a 500', async () => {
    const { GET } = await import('@/app/api/accounts/route')
    const res = await GET()
    expect(res).toBeInstanceOf(Response)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })
})
