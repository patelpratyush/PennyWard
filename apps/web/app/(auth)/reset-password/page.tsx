'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import AuthShell from '@/components/shared/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  password: z.string().min(8, 'Use at least 8 characters.'),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, { message: 'Passwords do not match.', path: ['confirm'] })
type Values = z.infer<typeof schema>

export default function ResetPassword() {
  const router = useRouter()
  const [done, setDone] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) })

  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 800))
    setDone(true)
    toast.success('Password updated.')
  }

  if (done) {
    return (
      <AuthShell title="Password updated">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center border border-[var(--moss)] bg-[var(--moss)]/10 text-[var(--moss)]">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[var(--ink-2)]">Your password has been changed. Sign in with your new password.</p>
          <Button
            onClick={() => router.push('/sign-in')}
            className="mt-6 h-12 w-full rounded-none border border-[var(--ink)] bg-[var(--ink)] font-mono text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--paper)] shadow-[4px_4px_0_0_var(--lime-deep)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[var(--ink)] hover:shadow-[6px_6px_0_0_var(--lime-deep)]"
          >
            Continue to sign in
          </Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Use at least 8 characters — a passphrase works great."
      footer={<Link href="/sign-in" className="font-medium text-[var(--rust)] hover:underline">Back to sign in</Link>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">New password</Label>
          <Input
            id="password" type="password" autoComplete="new-password" {...register('password')} aria-invalid={!!errors.password}
            className="h-11 rounded-none border-[var(--ink-3)] bg-[var(--paper)] px-3.5 text-[0.9375rem] text-[var(--ink)] shadow-none focus-visible:border-[var(--ink)] focus-visible:ring-[var(--lime-deep)]/40 aria-invalid:border-[var(--rust)] aria-invalid:ring-[var(--rust)]/20"
          />
          {errors.password && <p className="text-xs text-[var(--rust)]">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">Confirm new password</Label>
          <Input
            id="confirm" type="password" autoComplete="new-password" {...register('confirm')} aria-invalid={!!errors.confirm}
            className="h-11 rounded-none border-[var(--ink-3)] bg-[var(--paper)] px-3.5 text-[0.9375rem] text-[var(--ink)] shadow-none focus-visible:border-[var(--ink)] focus-visible:ring-[var(--lime-deep)]/40 aria-invalid:border-[var(--rust)] aria-invalid:ring-[var(--rust)]/20"
          />
          {errors.confirm && <p className="text-xs text-[var(--rust)]">{errors.confirm.message}</p>}
        </div>
        <Button
          type="submit" disabled={isSubmitting}
          className="h-12 w-full rounded-none border border-[var(--ink)] bg-[var(--ink)] font-mono text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--paper)] shadow-[4px_4px_0_0_var(--lime-deep)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[var(--ink)] hover:shadow-[6px_6px_0_0_var(--lime-deep)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_var(--lime-deep)]"
        >
          {isSubmitting ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </AuthShell>
  )
}
