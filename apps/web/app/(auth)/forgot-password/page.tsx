'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MailCheck } from 'lucide-react'
import AuthShell from '@/components/shared/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({ email: z.string().email('Enter a valid email address.') })

export default function ForgotPassword() {
  const [sent, setSent] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (v: { email: string }) => {
    await new Promise((r) => setTimeout(r, 700))
    setSent(v.email)
  }

  if (sent) {
    return (
      <AuthShell title="Check your inbox" footer={<Link href="/sign-in" className="font-medium text-[var(--rust)] hover:underline">Back to sign in</Link>}>
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center border border-[var(--moss)] bg-[var(--moss)]/10 text-[var(--moss)]">
            <MailCheck className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[var(--ink-2)]">
            If an account exists for <span className="font-medium text-[var(--ink)]">{sent}</span>, a reset link is on its way.
          </p>
          <Button
            asChild
            className="mt-6 h-12 w-full rounded-none border border-[var(--ink)] bg-[var(--ink)] font-mono text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--paper)] shadow-[4px_4px_0_0_var(--lime-deep)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[var(--ink)] hover:shadow-[6px_6px_0_0_var(--lime-deep)]"
          >
            <Link href={`/reset-password?email=${encodeURIComponent(sent)}`}>Continue to reset (demo)</Link>
          </Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email you use for Pennyward and we’ll send a reset link."
      footer={<Link href="/sign-in" className="font-medium text-[var(--rust)] hover:underline">Back to sign in</Link>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">Email</Label>
          <Input
            id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email}
            className="h-11 rounded-none border-[var(--ink-3)] bg-[var(--paper)] px-3.5 text-[0.9375rem] text-[var(--ink)] shadow-none focus-visible:border-[var(--ink)] focus-visible:ring-[var(--lime-deep)]/40 aria-invalid:border-[var(--rust)] aria-invalid:ring-[var(--rust)]/20"
          />
          {errors.email && <p className="text-xs text-[var(--rust)]">{errors.email.message}</p>}
        </div>
        <Button
          type="submit" disabled={isSubmitting}
          className="h-12 w-full rounded-none border border-[var(--ink)] bg-[var(--ink)] font-mono text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--paper)] shadow-[4px_4px_0_0_var(--lime-deep)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[var(--ink)] hover:shadow-[6px_6px_0_0_var(--lime-deep)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_var(--lime-deep)]"
        >
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </AuthShell>
  )
}
