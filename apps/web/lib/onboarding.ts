import { db } from './db'

export const ONBOARDING_STEPS = ['account', 'transaction', 'budget', 'goal', 'plaid', 'digest'] as const
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

/**
 * Flips one onboarding checklist step to complete. Idempotent, best-effort —
 * called inline from the routes that perform the underlying action (account
 * create, transaction create, etc), so the checklist stays accurate even if
 * the user takes the action outside the checklist UI. Never blocks or throws
 * into the caller's response on failure.
 */
export async function markOnboardingStep(userId: string, step: OnboardingStep) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { onboardingSteps: true } })
  const steps = (user?.onboardingSteps as Record<string, boolean> | null) ?? {}
  if (steps[step]) return
  await db.user.update({ where: { id: userId }, data: { onboardingSteps: { ...steps, [step]: true } } })
}
