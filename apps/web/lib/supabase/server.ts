import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 *
 * `cookies()` is async in this Next.js version, so this helper is async too.
 * Server Components cannot write cookies, hence the try/catch around `setAll`:
 * when Supabase wants to persist a refreshed token from a Server Component the
 * write is ignored, and the refresh is instead picked up by the proxy/middleware
 * (see lib/supabase/middleware.ts), which *can* write cookies.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Called from a Server Component — safe to ignore, the proxy refreshes.
          }
        },
      },
    },
  )
}
