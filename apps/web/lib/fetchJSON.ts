/**
 * Shared fetch helper for the React Query hooks in hooks/queries/*.
 *
 * Route handlers return `{ error: parsed.error.flatten() }` on Zod validation
 * failure — `flatten()` produces an OBJECT (`{ formErrors, fieldErrors }`),
 * not a string. Passing that straight into `new Error(...)` stringifies it to
 * the literal text "[object Object]", which is what users would see in a
 * toast. This extracts a readable message from either shape (a plain string
 * error, or a Zod flatten() object) before throwing.
 */

interface ZodFlattenedError {
  formErrors?: string[]
  fieldErrors?: Record<string, string[] | undefined>
}

function isZodFlattenedError(value: unknown): value is ZodFlattenedError {
  return typeof value === 'object' && value !== null && ('formErrors' in value || 'fieldErrors' in value)
}

/**
 * Thrown instead of a plain Error when a route returns `upgradeRequired(...)`
 * (see lib/plan.ts) — a 403 with `{ error: 'upgrade_required', message }`.
 * Callers that want to show an upsell rather than a generic error toast
 * check `instanceof UpgradeRequiredError` and read `.message` directly (it's
 * already the human-readable copy, not a Zod-flatten object).
 */
export class UpgradeRequiredError extends Error {}

function toErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string' && error.length > 0) return error
  if (isZodFlattenedError(error)) {
    const parts: string[] = [...(error.formErrors ?? [])]
    for (const [field, messages] of Object.entries(error.fieldErrors ?? {})) {
      if (messages?.length) parts.push(`${field}: ${messages.join(', ')}`)
    }
    if (parts.length > 0) return parts.join('; ')
  }
  return fallback
}

export async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    if (body?.error === 'upgrade_required') {
      throw new UpgradeRequiredError(typeof body.message === 'string' ? body.message : 'Upgrade required.')
    }
    throw new Error(toErrorMessage(body?.error, `Request failed: ${res.status}`))
  }
  return res.json()
}
