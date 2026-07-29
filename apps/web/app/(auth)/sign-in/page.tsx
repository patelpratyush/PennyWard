'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
    const result = await signIn('credentials', { email: v.email, password: v.password, redirect: false })
    if (result?.error) {
      setServerError('Invalid email or password.')
      toast.error('Invalid email or password.')
      return
    }
    toast.success('Welcome back to Pennyward.')
    const callbackUrl = searchParams.get('callbackUrl')
    router.push(callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/app/dashboard')
  }

  return (
    <AuthShell
      title="Sign in to Pennyward"
      subtitle="Pick up right where your money left off."
      footer={<>New to Pennyward? <Link href="/sign-up" className="font-medium text-primary hover:underline">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <GoogleButton label="Sign in" />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />or continue with email<span className="h-px flex-1 bg-border" />
        </div>
        {serverError && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" {...register('password')} aria-invalid={!!errors.password} />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={watch('remember')}
            onCheckedChange={(v) => setValue('remember', v === true)}
            aria-label="Remember me"
          />
          Remember me on this device
        </label>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  )
}
