import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refreshes the Supabase auth cookies on every matched request and gates
 * /app/* behind a session.
 *
 * Two constraints from Supabase's SSR contract are load-bearing here:
 *  1. `getUser()` — not `getSession()` — must be called, because it revalidates
 *     the JWT with the auth server. `getSession()` trusts the cookie and can be
 *     spoofed, so it must never be the basis of an authorization decision.
 *  2. No logic may run between `createServerClient` and `getUser()`, and the
 *     `supabaseResponse` object must be returned with its cookies intact —
 *     otherwise the refreshed tokens are dropped and the user gets logged out
 *     at random.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          supabaseResponse = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/app')) {
    const signInUrl = new URL('/sign-in', request.nextUrl.origin)
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
    return NextResponse.redirect(signInUrl)
  }

  return supabaseResponse
}
