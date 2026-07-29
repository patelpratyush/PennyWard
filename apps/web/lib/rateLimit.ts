import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// `retry: false` disables the client's built-in retry/backoff loop. Without a real
// Upstash instance configured, every call fails immediately (instead of retrying
// with exponential backoff for several seconds) so `checkRateLimit`'s fail-open
// catch below kicks in fast rather than stalling requests/tests.
const redis = Redis.fromEnv({ retry: false })

export const authRateLimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m') })
export const importRateLimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 h') })
// Credentials sign-in has a different abuse profile than registration (much higher
// legitimate volume from the same user re-typing a forgotten password, but also the
// actual brute-force/credential-stuffing target) — keyed by the submitted email rather
// than IP, since next-auth v5's `authorize` callback doesn't cleanly expose request IP.
export const loginRateLimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '5 m') })

/**
 * Checks a rate limit and fails OPEN (allows the request) if Redis is unreachable
 * or not configured. `Redis.fromEnv()` does not throw when `UPSTASH_REDIS_REST_URL`/
 * `UPSTASH_REDIS_REST_TOKEN` are missing — it only logs a warning and constructs a
 * client with empty credentials — but the first real `.limit()` call against that
 * client will throw (no valid endpoint to reach). Until a real Upstash Redis
 * instance is provisioned, that failure is caught here so auth/import stay usable
 * instead of 500ing.
 */
export async function checkRateLimit(limiter: Ratelimit, identifier: string): Promise<boolean> {
  try {
    const { success } = await limiter.limit(identifier)
    return success
  } catch (err) {
    console.warn('[rateLimit] Redis unavailable, failing open:', err)
    return true
  }
}
