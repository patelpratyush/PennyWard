import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { Prisma, type Plan } from '@prisma/client'

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
  //
  // A brand-new user's first page load fires several parallel API calls, each
  // hitting this at once — Prisma's `upsert` isn't a single atomic UPSERT on
  // Postgres (it's SELECT then INSERT/UPDATE), so two concurrent creates can
  // both pass the SELECT and race on the INSERT, and the loser gets a P2002
  // unique-constraint error instead of the row. Since only one is racing to
  // *create* the same id, that failure means the row now exists — just fetch it.
  let row
  try {
    row = await db.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        email: user.email ?? null,
        name: (user.user_metadata?.name as string | undefined) ?? null,
      },
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      row = await db.user.findUniqueOrThrow({ where: { id: user.id } })
    } else {
      throw err
    }
  }

  return { userId: user.id, plan: row.plan }
}
