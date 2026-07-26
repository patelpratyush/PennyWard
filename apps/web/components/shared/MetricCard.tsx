'use client'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AnimatedMoney } from './Money'
import { cn } from '@/lib/utils'

export function MetricCard({
  label, value, changePct, comparison, sparkline, tooltip, href, icon, tone = 'auto', animated = true,
}: {
  label: string
  value: number
  changePct?: number
  comparison?: string
  sparkline?: ReactNode
  tooltip?: string
  href?: string
  icon?: ReactNode
  tone?: 'auto' | 'positive-good' | 'negative-good'
  animated?: boolean
}) {
  // For debt/spending, a decrease can be good — tone controls the color mapping.
  const positive = (changePct ?? 0) >= 0
  const good = tone === 'negative-good' ? !positive : positive
  const content = (
    <Card className="group h-full shadow-card transition-shadow hover:shadow-lift">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {icon}
            <span>{label}</span>
            {tooltip && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground/70" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-56 text-xs">{tooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {changePct !== undefined && (
            <span className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tnum',
              good ? 'bg-success-muted text-success' : 'bg-destructive/10 text-destructive',
            )}>
              {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(changePct).toFixed(1)}%
            </span>
          )}
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">
          {animated ? <AnimatedMoney value={value} decimals={0} /> : value.toLocaleString()}
        </div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <p className="text-xs text-muted-foreground">{comparison ?? '\u00A0'}</p>
          {sparkline && <div className="h-8 w-20 shrink-0">{sparkline}</div>}
        </div>
      </CardContent>
    </Card>
  )
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {href ? <Link href={href} className="block h-full">{content}</Link> : content}
    </motion.div>
  )
}
