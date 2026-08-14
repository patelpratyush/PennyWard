'use client'
import { useMe, useUpdateMe } from './useMe'

export const ONBOARDING_CHECKLIST = [
  { step: 'account', label: 'Add your first account', href: '/app/accounts?add=1' },
  { step: 'transaction', label: 'Log a transaction or import a CSV', href: '/app/transactions?add=1' },
  { step: 'budget', label: 'Set up a budget', href: '/app/budgets' },
  { step: 'goal', label: 'Create a savings goal', href: '/app/goals?add=1' },
  { step: 'plaid', label: 'Connect a bank with Plaid', href: '/app/accounts' },
  { step: 'digest', label: 'Turn on the weekly email digest', href: '/app/settings/notifications' },
] as const

export function useOnboarding() {
  const me = useMe()
  const updateMe = useUpdateMe()
  const steps = me.data?.onboardingSteps ?? {}
  const completedCount = ONBOARDING_CHECKLIST.filter((s) => steps[s.step]).length
  const allDone = completedCount === ONBOARDING_CHECKLIST.length
  const dismissed = me.data?.onboardingDismissed ?? false
  return {
    isLoading: me.isLoading,
    steps,
    completedCount,
    total: ONBOARDING_CHECKLIST.length,
    allDone,
    visible: !me.isLoading && !dismissed && !allDone,
    dismiss: () => updateMe.mutate({ onboardingDismissed: true }),
  }
}
