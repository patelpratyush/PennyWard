'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
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
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: v.email, password: v.password, name: v.fullName }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      toast.error(typeof body.error === 'string' ? body.error : 'Could not create account.')
      return
    }
    const result = await signIn('credentials', { email: v.email, password: v.password, redirect: false })
    if (result?.error) {
      toast.error('Account created, but sign-in failed. Try signing in manually.')
      router.push('/sign-in')
      return
    }
    toast.success('Account created. Let’s set up your finances.')
    router.push('/onboarding')
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free forever plan. No credit card required."
      footer={<>Already have an account? <Link href="/sign-in" className="font-medium text-primary hover:underline">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <GoogleButton label="Sign up" />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />or with email<span className="h-px flex-1 bg-border" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" autoComplete="name" {...register('fullName')} aria-invalid={!!errors.fullName} />
          {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input id="password" type={show ? 'text' : 'password'} autoComplete="new-password" {...register('password')} aria-invalid={!!errors.password} />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {pw && (
            <div className="space-y-1" aria-live="polite">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className={cn('h-1 flex-1 rounded-full', i < s.score ? s.className : 'bg-muted')} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          )}
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" type="password" autoComplete="new-password" {...register('confirm')} aria-invalid={!!errors.confirm} />
          {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={watch('terms') === true}
              onCheckedChange={(v) => setValue('terms', v === true ? true : (false as never))}
              aria-label="Accept terms"
              className="mt-0.5"
            />
            <span className="text-muted-foreground">
              I agree to the <Link href="/terms" className="text-primary hover:underline">Terms of service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy policy</Link>.
            </span>
          </label>
          {errors.terms && <p className="text-xs text-destructive">{errors.terms.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  )
}
