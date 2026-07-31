'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import AuthShell, { GoogleButton } from '@/components/shared/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

const schema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  remember: z.boolean(),
})
type Values = z.infer<typeof schema>

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignIn />
    </Suspense>
  )
}

function SignIn() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [show, setShow] = useState(false)
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', remember: true },
  })

  const onSubmit = async (v: Values) => {
    setServerError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password })
    if (error) {
      setServerError('Invalid email or password.')
      toast.error('Invalid email or password.')
      return
    }
    toast.success('Welcome back to Pennyward.')
    const callbackUrl = searchParams.get('callbackUrl')
    router.push(callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/app/dashboard')
    // The session cookie was just set client-side; refresh so server components
    // and the proxy re-evaluate with it rather than serving a signed-out render.
    router.refresh()
  }

  return (
    <AuthShell
      title="Sign in to Pennyward"
      subtitle="Pick up right where your money left off."
      footer={<>New to Pennyward? <Link href="/sign-up" className="font-medium text-[var(--rust)] hover:underline">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <GoogleButton label="Sign in" />
        <div className="flex items-center gap-3 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--ink-3)]">
          <span className="h-px flex-1 bg-[var(--rule-strong)]" />or continue with email<span className="h-px flex-1 bg-[var(--rule-strong)]" />
        </div>
        {serverError && (
          <p className="border border-[var(--rust)] bg-[var(--rust)]/10 px-3.5 py-2.5 text-sm text-[var(--rust)]">
            {serverError}
          </p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">Email</Label>
          <Input
            id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email}
            className="h-11 rounded-none border-[var(--ink-3)] bg-[var(--paper)] px-3.5 text-[0.9375rem] text-[var(--ink)] shadow-none focus-visible:border-[var(--ink)] focus-visible:ring-[var(--lime-deep)]/40 aria-invalid:border-[var(--rust)] aria-invalid:ring-[var(--rust)]/20"
          />
          {errors.email && <p className="text-xs text-[var(--rust)]">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">Password</Label>
            <Link href="/forgot-password" className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--rust)] hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <Input
              id="password" type={show ? 'text' : 'password'} autoComplete="current-password" {...register('password')} aria-invalid={!!errors.password}
              className="h-11 rounded-none border-[var(--ink-3)] bg-[var(--paper)] px-3.5 text-[0.9375rem] text-[var(--ink)] shadow-none focus-visible:border-[var(--ink)] focus-visible:ring-[var(--lime-deep)]/40 aria-invalid:border-[var(--rust)] aria-invalid:ring-[var(--rust)]/20"
            />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)] hover:text-[var(--ink)]">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-[var(--rust)]">{errors.password.message}</p>}
        </div>
        <label className="flex items-center gap-2.5 text-sm text-[var(--ink-2)]">
          <Checkbox
            checked={watch('remember')}
            onCheckedChange={(v) => setValue('remember', v === true)}
            aria-label="Remember me"
            className="rounded-none border-[var(--ink-3)] data-[state=checked]:border-[var(--ink)] data-[state=checked]:bg-[var(--ink)] data-[state=checked]:text-[var(--paper)]"
          />
          Remember me on this device
        </label>
        <Button
          type="submit" disabled={isSubmitting}
          className="h-12 w-full rounded-none border border-[var(--ink)] bg-[var(--ink)] font-mono text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--paper)] shadow-[4px_4px_0_0_var(--lime-deep)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[var(--ink)] hover:shadow-[6px_6px_0_0_var(--lime-deep)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_var(--lime-deep)]"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  )
}
