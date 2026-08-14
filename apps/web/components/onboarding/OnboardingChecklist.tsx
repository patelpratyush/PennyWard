'use client'
import Link from 'next/link'
import { CheckCircle2, Circle, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ONBOARDING_CHECKLIST, useOnboarding } from '@/hooks/queries/useOnboarding'
import { cn } from '@/lib/utils'

export function OnboardingChecklist() {
  const { visible, steps, completedCount, total, dismiss } = useOnboarding()
  if (!visible) return null

  return (
    <Card className="mb-6 border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Get set up</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {completedCount} of {total} steps done — finish these to see Pennyward do its thing.
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={dismiss} aria-label="Dismiss checklist">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Progress value={(completedCount / total) * 100} className="mt-2 h-1.5" />
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-1">
          {ONBOARDING_CHECKLIST.map(({ step, label, href }) => {
            const done = Boolean(steps[step])
            return (
              <li key={step}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted',
                    done && 'text-muted-foreground',
                  )}
                >
                  {done
                    ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <span className={cn(done && 'line-through')}>{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
