import { auth } from '@/auth'

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

export async function getRequiredSession(): Promise<{ userId: string }> {
  const session = await auth()
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    throw new UnauthorizedError()
  }
  return { userId }
}
