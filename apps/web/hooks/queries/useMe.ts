'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJSON } from '@/lib/fetchJSON'
import type { PLAN_LIMITS } from '@/lib/plan'

type Plan = 'free' | 'pro' | 'household'

// `Infinity` in PLAN_LIMITS serializes to `null` over JSON (see app/api/me/
// route.ts) — every numeric field arrives as `number | null`, null meaning
// unlimited. Non-numeric fields (booleans) pass through unchanged.
type SerializedLimits = {
  [K in keyof (typeof PLAN_LIMITS)[Plan]]: (typeof PLAN_LIMITS)[Plan][K] extends number
    ? number | null
    : (typeof PLAN_LIMITS)[Plan][K]
}

interface Me {
  name: string | null
  email: string | null
  plan: Plan
  limits: SerializedLimits
  weeklyDigestEnabled: boolean
}

/**
 * The real, server-held plan — replaces reading `profile.plan` out of the
 * Zustand/localStorage store, which anyone could edit in devtools to grant
 * themselves every tier. Client-side gates (disabling the Import CSV button,
 * the Goals/Watchlists add buttons) read `limits` from here; the actual
 * enforcement for the two of these with a real backend still happens
 * server-side regardless of what the client shows.
 */
export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => fetchJSON<Me>('/api/me') })
}

export function useUpdateMe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: { weeklyDigestEnabled: boolean }) =>
      fetchJSON('/api/me', { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  })
}
