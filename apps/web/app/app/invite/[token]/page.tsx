'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAcceptInvite } from '@/hooks/queries/useHousehold'
import { ErrorState } from '@/components/shared/States'
import { LoadingSkeleton } from '@/components/shared/States'

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const acceptInvite = useAcceptInvite()
  const [error, setError] = useState<string | null>(null)
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true
    acceptInvite.mutate(token, {
      onSuccess: () => {
        toast.success('Joined the household.')
        router.push('/app/settings/household')
      },
      onError: () => setError('This invite is invalid, expired, or already used.'),
    })
  }, [token, acceptInvite, router])

  if (error) {
    return <ErrorState title="Couldn't join household" description={error} onRetry={() => router.push('/app/settings/household')} />
  }
  return <LoadingSkeleton rows={4} />
}
