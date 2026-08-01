'use client'
import { useQuery } from '@tanstack/react-query'
import { fetchJSON } from '@/lib/fetchJSON'
import type { PLAN_LIMITS } from '@/lib/plan'

type Plan = 'free' | 'pro' | 'household'

interface Me {
  name: string | null
  email: string | null
  plan: Plan
  limits: (typeof PLAN_LIMITS)[Plan]
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
