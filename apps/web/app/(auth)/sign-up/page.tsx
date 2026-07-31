'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import { cn } from '@/lib/utils'

const schema = z.object({
  fullName: z.string().min(2, 'Enter your full name.'),
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
  confirm: z.string(),
  terms: z.boolean().refine((v) => v === true, { message: 'Accept the terms to continue.' }),
}).refine((v) => v.password === v.confirm, { message: 'Passwords do not match.', path: ['confirm'] })
type Values = z.infer<typeof schema>

function strength(pw: string): { score: number; label: string; className: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map = [
    { label: 'Too weak', className: 'bg-destructive' },
    { label: 'Weak', className: 'bg-destructive' },
    { label: 'Fair', className: 'bg-warning' },
    { label: 'Good', className: 'bg-warning' },
    { label: 'Strong', className: 'bg-success' },
    { label: 'Excellent', className: 'bg-success' },
  ]
  return { score, ...map[score] }
}

export default function SignUp() {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { terms: false },
  })
  const pw = watch('password') ?? ''
  const s = useMemo(() => strength(pw), [pw])

  const onSubmit = async (v: Values) => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: { data: { name: v.fullName } },
    })
    if (error) {
      toast.error(error.message || 'Could not create account.')
      return
    }
    // With email confirmation enabled Supabase returns a user but no session;
    // the account exists but cannot be used until the link is clicked, so send
    // them to sign-in with an explanation rather than a dead-end onboarding.
    if (!data.session) {
      toast.success('Account created. Check your email to confirm, then sign in.')
      router.push('/sign-in')
      return
    }
    toast.success('Account created. Let’s set up your finances.')
    router.push('/onboarding')
    router.refresh()
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free forever plan. No credit card required."
      footer={<>Already have an account? <Link href="/sign-in" className="font-medium text-[var(--rust)] hover:underline">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <GoogleButton label="Sign up" />
        <div className="flex items-center gap-3 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--ink-3)]">
          <span className="h-px flex-1 bg-[var(--rule-strong)]" />or with email<span className="h-px flex-1 bg-[var(--rule-strong)]" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fullName" className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">Full name</Label>
          <Input
            id="fullName" autoComplete="name" {...register('fullName')} aria-invalid={!!errors.fullName}
            className="h-11 rounded-none border-[var(--ink-3)] bg-[var(--paper)] px-3.5 text-[0.9375rem] text-[var(--ink)] shadow-none focus-visible:border-[var(--ink)] focus-visible:ring-[var(--lime-deep)]/40 aria-invalid:border-[var(--rust)] aria-invalid:ring-[var(--rust)]/20"
          />
          {errors.fullName && <p className="text-xs text-[var(--rust)]">{errors.fullName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">Email</Label>
          <Input
            id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email}
            className="h-11 rounded-none border-[var(--ink-3)] bg-[var(--paper)] px-3.5 text-[0.9375rem] text-[var(--ink)] shadow-none focus-visible:border-[var(--ink)] focus-visible:ring-[var(--lime-deep)]/40 aria-invalid:border-[var(--rust)] aria-invalid:ring-[var(--rust)]/20"
          />
          {errors.email && <p className="text-xs text-[var(--rust)]">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">Password</Label>
          <div className="relative">
            <Input
              id="password" type={show ? 'text' : 'password'} autoComplete="new-password" {...register('password')} aria-invalid={!!errors.password}
              className="h-11 rounded-none border-[var(--ink-3)] bg-[var(--paper)] px-3.5 text-[0.9375rem] text-[var(--ink)] shadow-none focus-visible:border-[var(--ink)] focus-visible:ring-[var(--lime-deep)]/40 aria-invalid:border-[var(--rust)] aria-invalid:ring-[var(--rust)]/20"
            />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)] hover:text-[var(--ink)]">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {pw && (
            <div className="space-y-1.5 pt-0.5" aria-live="polite">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className={cn('h-1 flex-1', i < s.score ? s.className : 'bg-[var(--rule-strong)]')} />
                ))}
              </div>
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--ink-3)]">{s.label}</p>
            </div>
          )}
          {errors.password && <p className="text-xs text-[var(--rust)]">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">Confirm password</Label>
          <Input
            id="confirm" type="password" autoComplete="new-password" {...register('confirm')} aria-invalid={!!errors.confirm}
            className="h-11 rounded-none border-[var(--ink-3)] bg-[var(--paper)] px-3.5 text-[0.9375rem] text-[var(--ink)] shadow-none focus-visible:border-[var(--ink)] focus-visible:ring-[var(--lime-deep)]/40 aria-invalid:border-[var(--rust)] aria-invalid:ring-[var(--rust)]/20"
          />
          {errors.confirm && <p className="text-xs text-[var(--rust)]">{errors.confirm.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="flex items-start gap-2.5 text-sm text-[var(--ink-2)]">
            <Checkbox
              checked={watch('terms') === true}
              onCheckedChange={(v) => setValue('terms', v === true ? true : (false as never))}
              aria-label="Accept terms"
              className="mt-0.5 rounded-none border-[var(--ink-3)] data-[state=checked]:border-[var(--ink)] data-[state=checked]:bg-[var(--ink)] data-[state=checked]:text-[var(--paper)]"
            />
            <span>
              I agree to the <Link href="/terms" className="text-[var(--rust)] hover:underline">Terms of service</Link> and <Link href="/privacy" className="text-[var(--rust)] hover:underline">Privacy policy</Link>.
            </span>
          </label>
          {errors.terms && <p className="text-xs text-[var(--rust)]">{errors.terms.message}</p>}
        </div>
        <Button
          type="submit" disabled={isSubmitting}
          className="h-12 w-full rounded-none border border-[var(--ink)] bg-[var(--ink)] font-mono text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--paper)] shadow-[4px_4px_0_0_var(--lime-deep)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[var(--ink)] hover:shadow-[6px_6px_0_0_var(--lime-deep)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_var(--lime-deep)]"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  )
}
