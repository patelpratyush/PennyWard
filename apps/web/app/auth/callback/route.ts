import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * OAuth (Google) redirect target: exchanges the auth code Supabase appended
 * to the URL for a session, then sends the user on to onboarding. Requires
 * the Google provider to be enabled in the Supabase dashboard (Authentication
 * → Providers) with a real Google Cloud OAuth client id/secret — this route
 * is inert without that configuration.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}/onboarding`)
  }

  return NextResponse.redirect(`${origin}/sign-in?error=oauth_failed`)
}
