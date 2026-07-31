import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  /**
   * /app/* is gated here. The auth and onboarding routes are matched too so a
   * signed-in user's tokens keep getting refreshed while they sit on them —
   * Supabase's refresh only happens on requests this proxy actually sees.
   */
  matcher: ['/app/:path*', '/sign-in', '/sign-up', '/onboarding'],
}
