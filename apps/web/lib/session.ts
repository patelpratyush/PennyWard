import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import type { Plan } from '@prisma/client'

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
 * Originally returned only `{ userId }` (that was the whole Auth.js-era
 * shape); `plan` was added later as a plain extra field. Every existing call
 * site destructures `{ userId }` and JS ignores the rest, so this stayed
 * non-breaking for all 15 pre-existing route handlers — only the handlers
 * that actually need to gate on plan destructure `{ userId, plan }`.
 *
 * `getUser()` is used rather than `getSession()` because it revalidates the JWT
 * against the auth server; `getSession()` trusts the cookie contents and must
 * never back an authorization decision.
 */
export async function getRequiredSession(): Promise<{ userId: string; plan: Plan }> {
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
  // `upsert` returns the full row, so an existing user's `plan` (set manually
  // in the DB, never by the app) round-trips here without a second query.
  const row = await db.user.upsert({
    where: { id: user.id },
    update: {},
    create: {
      id: user.id,
      email: user.email ?? null,
      name: (user.user_metadata?.name as string | undefined) ?? null,
    },
  })

  return { userId: user.id, plan: row.plan }
}
