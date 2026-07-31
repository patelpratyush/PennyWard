import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// `retry: false` disables the client's built-in retry/backoff loop. Without a real
// Upstash instance configured, every call fails immediately (instead of retrying
// with exponential backoff for several seconds) so `checkRateLimit`'s fail-open
// catch below kicks in fast rather than stalling requests/tests.
const redis = Redis.fromEnv({ retry: false })

export const importRateLimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 h') })

// NOTE: the sign-up and sign-in limiters that used to live here were applied
// inside Auth.js's `authorize` callback and the local /api/auth/register route.
// Both are gone now that Supabase Auth owns the credential flow — sign-up and
// sign-in never touch this application's routes, so we cannot throttle them
// here. Supabase enforces its own rate limits on its auth endpoints; if tighter
// limits are wanted they have to be configured in the Supabase dashboard
// (Authentication → Rate Limits) rather than in this file.

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
