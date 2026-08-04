import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client — bypasses RLS and can call Supabase Auth's
 * admin API (e.g. `auth.admin.deleteUser`). Never import this into anything
 * that runs client-side; it must only be used from server-only route
 * handlers that have already established the caller's identity themselves
 * (e.g. via getRequiredSession()) before using this client's elevated access.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
