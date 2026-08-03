'use client'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  MoreHorizontal, Pause,
  Pencil, PiggyBank, Play, Plus, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/stores/useStore'
import { useAccounts } from '@/hooks/queries/useAccounts'
import { useMe } from '@/hooks/queries/useMe'
import { PageHeader, StatusBadge } from '@/components/shared/Misc'
import { EmptyState } from '@/components/shared/States'
import { Money } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { GoalDialog, goalIcons } from '@/components/financial/GoalDialog'
import { goalMath } from '@/lib/finance/budget'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Goal } from '@/types'

function GoalsInner() {
  const { goals, updateGoal, deleteGoal } = useStore()
  const { data: accounts = [] } = useAccounts()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  // Goals have no backend (still local to this browser via useStore) — this
  // is a UI-only gate matching the pricing page, not a security boundary.
  const { data: me } = useMe()
  const goalsAllowed = me?.limits.goals ?? true

  useEffect(() => {
    if (searchParams.get('add') !== '1') return
    // Wait for the real plan to load before deciding — `goalsAllowed` defaults
    // to true while `me` is still fetching, which would otherwise open the
    // dialog for a Free user and strip `add` before the gate ever applies.
    if (me === undefined) return
    if (goalsAllowed) {
      setEditing(null)
      setDialogOpen(true)
    }
    const next = new URLSearchParams(searchParams.toString())
    next.delete('add')
    router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname)
  }, [searchParams, pathname, router, me, goalsAllowed])

  return (
    <div>
      <PageHeader
        title="Savings goals"
        description="Milestones, monthly contributions, and the finish line."
        actions={
          goalsAllowed ? (
            <Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="mr-1.5 h-4 w-4" />Add goal</Button>
          ) : (
            <Button asChild variant="outline"><Link href="/pricing">Upgrade for goals</Link></Button>
          )
        }
      />

      {goals.length === 0 ? (
        <EmptyState
          icon={<PiggyBank className="h-6 w-6" />}
          title="No savings goals yet"
          description={
            goalsAllowed
              ? 'Create an emergency fund, vacation fund, or down-payment goal and track every contribution.'
              : 'Savings goals are a Pro feature. Upgrade to start tracking one.'
          }
          actionLabel={goalsAllowed ? 'Add goal' : 'See plans'}
          onAction={() => goalsAllowed ? setDialogOpen(true) : router.push('/pricing')}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((g, idx) => {
            const gm = goalMath(g)
            const Icon = goalIcons[g.type]
            const account = accounts.find((a) => a.id === g.accountId)
            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Card className="h-full shadow-card">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <Link href={`/app/goals/${g.id}`} className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold hover:underline">{g.name}</span>
                          <span className="text-xs text-muted-foreground">{account ? `Linked: ${account.name}` : 'No linked account'}</span>
                        </span>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`${g.name} actions`}><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild><Link href={`/app/goals/${g.id}`}>Open details</Link></DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditing(g); setDialogOpen(true) }}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            updateGoal(g.id, { status: g.status === 'paused' ? 'on_track' : 'paused' })
                            toast.success(g.status === 'paused' ? 'Goal resumed.' : 'Goal paused.')
                          }}>
                            {g.status === 'paused' ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                            {g.status === 'paused' ? 'Resume' : 'Pause'}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => { deleteGoal(g.id); toast.success('Goal deleted.') }}>
                            <Trash2 className="mr-2 h-4 w-4" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-baseline justify-between">
                        <Money value={g.currentAmount} className="text-2xl font-bold" decimals={0} />
                        <span className="text-sm text-muted-foreground tnum">of {formatCurrency(g.targetAmount, { decimals: 0 })}</span>
                      </div>
                      <div className="relative mt-2">
                        <Progress value={gm.pct} className="h-2.5" />
                        {[25, 50, 75].map((m) => (
                          <span key={m} className="absolute top-0 h-2.5 w-px bg-background" style={{ left: `${m}%` }} />
                        ))}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-semibold tnum">{gm.pct.toFixed(0)}%</span>
                        <StatusBadge status={g.status === 'completed' ? 'completed' : g.status === 'paused' ? 'paused' : gm.onTrack ? 'on_track' : 'behind'} />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                      <div><p className="text-muted-foreground">Target date</p><p className="font-medium tnum">{formatDate(g.targetDate, 'MMM yyyy')}</p></div>
                      <div><p className="text-muted-foreground">Monthly contribution</p><p className="font-medium tnum">{formatCurrency(g.monthlyContribution, { decimals: 0 })}</p></div>
                      <div><p className="text-muted-foreground">Needed monthly</p><p className="font-medium tnum">{formatCurrency(gm.requiredMonthly, { decimals: 0 })}</p></div>
                      <div><p className="text-muted-foreground">Est. completion</p><p className="font-medium tnum">{gm.estimatedCompletion ? formatDate(gm.estimatedCompletion, 'MMM yyyy') : '—'}</p></div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <GoalDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  )
}

export default function GoalsPage() {
  return (
    <Suspense fallback={null}>
      <GoalsInner />
    </Suspense>
  )
}
