'use client'
import { cn } from '@/lib/utils'

/**
 * Ledger wordmark. The mark is a hand-ruled ledger square with an ascending
 * rule; the wordmark itself is set in the editorial serif with a rust period,
 * matching the masthead on the landing page.
 */
export function Logo({ className, markOnly = false }: { className?: string; markOnly?: boolean }) {
  return (
    <span className={cn('inline-flex items-baseline gap-2', className)}>
      <span
        className="relative inline-flex h-7 w-7 shrink-0 translate-y-0.5 items-center justify-center border border-foreground bg-primary text-primary-foreground"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path d="M3 19h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
          <path d="M4 15.5 9.5 10l3.5 3.5L20 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {!markOnly && (
        <span className="display text-[1.35rem] leading-none tracking-[-0.03em]">
          Pennyward<span className="text-destructive">.</span>
        </span>
      )}
    </span>
  )
}
