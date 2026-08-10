import { Resend } from 'resend'

/**
 * Server-only Resend client. The account is on Resend's free tier with no
 * custom domain verified yet, so the `from` address stays on Resend's shared
 * `onboarding@resend.dev` — that sender can only deliver to the account
 * owner's own verified email until a real domain is added and DNS-verified
 * in the Resend dashboard. Swap RESEND_FROM once that's done.
 */
export function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY)
}

export const DIGEST_FROM = process.env.RESEND_FROM ?? 'Pennyward <onboarding@resend.dev>'
