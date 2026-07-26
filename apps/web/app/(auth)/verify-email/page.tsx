'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, MailWarning, MailX } from 'lucide-react'
import { toast } from 'sonner'
import AuthShell from '@/components/shared/AuthShell'
import { Button } from '@/components/ui/button'
import { useStore } from '@/stores/useStore'

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
      icon: <MailWarning className="h-12 w-12 text-warning" />,
      title: 'Verify your email',
      text: <>We sent a verification link to <span className="font-medium text-foreground">{email}</span>. Open it to activate your account.</>,
    },
    verified: {
      icon: <CheckCircle2 className="h-12 w-12 text-success" />,
      title: 'Email verified',
      text: <>Your email is confirmed. You have full access to FinPilot.</>,
    },
    expired: {
      icon: <MailX className="h-12 w-12 text-destructive" />,
      title: 'Link expired',
      text: <>That verification link has expired. Request a fresh one below.</>,
    },
  }[state]

  return (
    <AuthShell title={content.title} footer={<Link href="/sign-in" className="font-medium text-primary hover:underline">Back to sign in</Link>}>
      <div className="flex flex-col items-center text-center">
        {content.icon}
        <p className="mt-4 text-sm text-muted-foreground">{content.text}</p>
        <div className="mt-6 w-full space-y-2">
          {state === 'verified' ? (
            <Button asChild className="w-full"><Link href="/app/dashboard">Go to dashboard</Link></Button>
          ) : (
            <>
              <Button className="w-full" onClick={resend} disabled={resending}>
                {resending ? 'Resending…' : 'Resend verification email'}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setState(state === 'pending' ? 'verified' : 'pending')}>
                {state === 'pending' ? 'Simulate verified (demo)' : 'Back'}
              </Button>
              {state === 'pending' && (
                <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setState('expired')}>
                  Simulate expired link (demo)
                </Button>
              )}
              <p className="pt-1 text-xs text-muted-foreground">
                Wrong address? <Link href="/app/settings/profile" className="text-primary hover:underline">Change email</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </AuthShell>
  )
}
