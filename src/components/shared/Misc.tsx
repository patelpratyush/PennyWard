import type { ReactNode } from 'react'
import { CheckCircle2, CircleDashed, Clock, AlertCircle, PauseCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function PageHeader({ title, description, actions, className }: {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function ChartCard({ title, description, actions, children, className, summary }: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  summary?: string // accessible text summary of the chart
}) {
  return (
    <Card className={cn('shadow-card', className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </CardHeader>
      <CardContent>
        {summary && <p className="sr-only">{summary}</p>}
        {children}
      </CardContent>
    </Card>
  )
}

type StatusKind = 'on_track' | 'near_limit' | 'over_budget' | 'no_activity' | 'paid' | 'due' | 'overdue' | 'completed' | 'paused' | 'behind'

const statusConfig: Record<StatusKind, { label: string; className: string; icon: ReactNode }> = {
  on_track: { label: 'On track', className: 'bg-success-muted text-success border-transparent', icon: <CheckCircle2 className="h-3 w-3" /> },
  near_limit: { label: 'Near limit', className: 'bg-warning-muted text-warning border-transparent', icon: <Clock className="h-3 w-3" /> },
  over_budget: { label: 'Over budget', className: 'bg-destructive/10 text-destructive border-transparent', icon: <AlertCircle className="h-3 w-3" /> },
  no_activity: { label: 'No activity', className: 'bg-muted text-muted-foreground border-transparent', icon: <CircleDashed className="h-3 w-3" /> },
  paid: { label: 'Paid', className: 'bg-success-muted text-success border-transparent', icon: <CheckCircle2 className="h-3 w-3" /> },
  due: { label: 'Due soon', className: 'bg-warning-muted text-warning border-transparent', icon: <Clock className="h-3 w-3" /> },
  overdue: { label: 'Overdue', className: 'bg-destructive/10 text-destructive border-transparent', icon: <AlertCircle className="h-3 w-3" /> },
  completed: { label: 'Completed', className: 'bg-success-muted text-success border-transparent', icon: <CheckCircle2 className="h-3 w-3" /> },
  paused: { label: 'Paused', className: 'bg-muted text-muted-foreground border-transparent', icon: <PauseCircle className="h-3 w-3" /> },
  behind: { label: 'Behind', className: 'bg-warning-muted text-warning border-transparent', icon: <Clock className="h-3 w-3" /> },
}

export function StatusBadge({ status, label }: { status: StatusKind; label?: string }) {
  const cfg = statusConfig[status]
  return (
    <Badge variant="outline" className={cn('gap-1 text-[11px] font-medium', cfg.className)}>
      {cfg.icon}
      {label ?? cfg.label}
    </Badge>
  )
}
