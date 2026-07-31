import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

/**
 * Thrown by `getRequiredSession` when there is no authenticated user.
 *
 * Next.js App Router route handlers only inspect *returned* Response objects —
 * a *thrown* Response is treated as an uncaught exception and surfaces to the
 * client as a generic 500, not a 401. Throwing a plain Error subclass instead
 * lets `withAuthErrorHandling` (see `lib/withAuth.ts`) catch it and translate
 * it into a proper 401 JSON response.
 */
export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized')
    this.name = 'UnauthorizedError'
  }
}

/**
 * Resolves the current user from the Supabase session.
 *
 * Deliberately keeps the `Promise<{ userId: string }>` shape it had under
 * Auth.js so that all 15 route handlers, `withAuthErrorHandling`, and the
 * existing test suite are unaffected by the auth provider swap. The returned
 * `userId` is now the Supabase `auth.users.id` (a uuid) rather than a cuid.
 *
 * `getUser()` is used rather than `getSession()` because it revalidates the JWT
 * against the auth server; `getSession()` trusts the cookie contents and must
 * never back an authorization decision.
 */
export async function getRequiredSession(): Promise<{ userId: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new UnauthorizedError()

  // Supabase owns identity in auth.users; the public User row is a profile
  // mirror that the domain tables' foreign keys point at. Creating it lazily on
  // first authenticated request means no database trigger or webhook is needed
  // to keep the two in sync, and a user created by any means (email, OAuth,
  // dashboard) gets a profile row the first time they actually use the app.
  await db.user.upsert({
    where: { id: user.id },
    update: {},
    create: {
      id: user.id,
      email: user.email ?? null,
      name: (user.user_metadata?.name as string | undefined) ?? null,
    },
  })

  return { userId: user.id }
}
