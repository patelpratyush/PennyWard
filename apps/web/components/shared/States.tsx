'use client'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function EmptyState({
  title, description, actionLabel, actionHref, onAction, icon, className,
}: {
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 px-6 py-12 text-center', className)}>
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel && (actionHref ? (
        <Button asChild className="mt-4">
          <Link href={actionHref}>{actionLabel}<ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
      ) : onAction ? (
        <Button className="mt-4" onClick={onAction}>{actionLabel}</Button>
      ) : null)}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', description, onRetry }: {
  title?: string
  description: string
  onRetry?: () => void
}) {
  return (
    <Card className="border-destructive/40">
      <CardContent className="flex flex-col items-center px-6 py-10 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        {onRetry && <Button variant="outline" className="mt-4" onClick={onRetry}>Try again</Button>}
      </CardContent>
    </Card>
  )
}

export function LoadingSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  )
}
