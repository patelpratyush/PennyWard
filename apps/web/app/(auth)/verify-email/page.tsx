'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, MailWarning, MailX } from 'lucide-react'
import { toast } from 'sonner'
import AuthShell from '@/components/shared/AuthShell'
import { Button } from '@/components/ui/button'
import { useStore } from '@/stores/useStore'
import { cn } from '@/lib/utils'

type State = 'pending' | 'verified' | 'expired'

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  )
}

function VerifyEmail() {
  const params = useSearchParams()
  const email = useStore((s) => s.profile.email)
  const [state, setState] = useState<State>((params.get('state') as State) ?? 'pending')
  const [resending, setResending] = useState(false)

  const resend = async () => {
    setResending(true)
    await new Promise((r) => setTimeout(r, 700))
    setResending(false)
    toast.success('Verification email resent.')
  }

  const content = {
    pending: {
      icon: <MailWarning className="h-6 w-6" />,
      iconClass: 'border-[var(--rust)] bg-[var(--rust)]/10 text-[var(--rust)]',
      title: 'Verify your email',
      text: <>We sent a verification link to <span className="font-medium text-[var(--ink)]">{email}</span>. Open it to activate your account.</>,
    },
    verified: {
      icon: <CheckCircle2 className="h-6 w-6" />,
      iconClass: 'border-[var(--moss)] bg-[var(--moss)]/10 text-[var(--moss)]',
      title: 'Email verified',
      text: <>Your email is confirmed. You have full access to Pennyward.</>,
    },
    expired: {
      icon: <MailX className="h-6 w-6" />,
      iconClass: 'border-[var(--rust)] bg-[var(--rust)]/10 text-[var(--rust)]',
      title: 'Link expired',
      text: <>That verification link has expired. Request a fresh one below.</>,
    },
  }[state]

  return (
    <AuthShell title={content.title} footer={<Link href="/sign-in" className="font-medium text-[var(--rust)] hover:underline">Back to sign in</Link>}>
      <div className="flex flex-col items-center text-center">
        <div className={cn('flex h-12 w-12 items-center justify-center border', content.iconClass)}>
          {content.icon}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[var(--ink-2)]">{content.text}</p>
        <div className="mt-6 w-full space-y-3">
          {state === 'verified' ? (
            <Button
              asChild
              className="h-12 w-full rounded-none border border-[var(--ink)] bg-[var(--ink)] font-mono text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--paper)] shadow-[4px_4px_0_0_var(--lime-deep)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[var(--ink)] hover:shadow-[6px_6px_0_0_var(--lime-deep)]"
            >
              <Link href="/app/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button
                onClick={resend} disabled={resending}
                className="h-12 w-full rounded-none border border-[var(--ink)] bg-[var(--ink)] font-mono text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--paper)] shadow-[4px_4px_0_0_var(--lime-deep)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[var(--ink)] hover:shadow-[6px_6px_0_0_var(--lime-deep)]"
              >
                {resending ? 'Resending…' : 'Resend verification email'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setState(state === 'pending' ? 'verified' : 'pending')}
                className="h-12 w-full rounded-none border border-[var(--ink-3)] bg-transparent font-mono text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--ink)] shadow-none hover:border-[var(--ink)] hover:bg-[var(--paper)]"
              >
                {state === 'pending' ? 'Simulate verified (demo)' : 'Back'}
              </Button>
              {state === 'pending' && (
                <Button
                  variant="ghost"
                  onClick={() => setState('expired')}
                  className="h-11 w-full rounded-none font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--ink-3)] hover:bg-transparent hover:text-[var(--rust)]"
                >
                  Simulate expired link (demo)
                </Button>
              )}
              <p className="pt-1 text-xs text-[var(--ink-3)]">
                Wrong address? <Link href="/app/settings/profile" className="text-[var(--rust)] hover:underline">Change email</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </AuthShell>
  )
}
