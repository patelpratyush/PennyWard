import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '@/app/api/quotes/route'

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: 'user_test', plan: 'pro' })) }))

const originalKey = process.env.FINNHUB_API_KEY

beforeEach(() => { delete process.env.FINNHUB_API_KEY })
afterEach(() => { process.env.FINNHUB_API_KEY = originalKey })

describe('GET /api/quotes', () => {
  it('reports configured: false and no quotes when FINNHUB_API_KEY is unset', async () => {
    const res = await GET(new Request('http://x?tickers=AAPL,MSFT'))
    const body = await res.json()
    expect(body.configured).toBe(false)
    expect(body.quotes).toEqual({})
  })

  it('returns an empty quotes object when no tickers are requested', async () => {
    const res = await GET(new Request('http://x'))
    const body = await res.json()
    expect(body.quotes).toEqual({})
  })
})
