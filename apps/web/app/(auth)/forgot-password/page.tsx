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
      <AuthShell title="Check your inbox" footer={<Link href="/sign-in" className="font-medium text-primary hover:underline">Back to sign in</Link>}>
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-muted text-success">
            <MailCheck className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            If an account exists for <span className="font-medium text-foreground">{sent}</span>, a reset link is on its way.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link href={`/reset-password?email=${encodeURIComponent(sent)}`}>Continue to reset (demo)</Link>
          </Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email you use for FinPilot and we’ll send a reset link."
      footer={<Link href="/sign-in" className="font-medium text-primary hover:underline">Back to sign in</Link>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </AuthShell>
  )
}
