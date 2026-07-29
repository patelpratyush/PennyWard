import { NextResponse } from 'next/server'
import { UnauthorizedError } from '@/lib/session'

/**
 * Wraps a route handler so an `UnauthorizedError` thrown by `getRequiredSession()`
 * (called anywhere inside the handler) turns into a proper 401 JSON response
 * instead of an uncaught exception bubbling up as a generic 500.
 */
export function withAuthErrorHandling<T extends (...args: never[]) => Promise<Response>>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args)
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      throw err
    }
  }) as T
}
