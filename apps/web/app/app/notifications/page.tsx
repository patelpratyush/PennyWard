'use client'
import { useMemo, useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import {
  Bell, BellOff, CheckCheck, CreditCard, FileUp, Info, Landmark,
  LineChart, PiggyBank, Trash2, Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/stores/useStore'
import { PageHeader } from '@/components/shared/Misc'
import { EmptyState } from '@/components/shared/States'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { NotificationType } from '@/types'

const typeIcons: Record<NotificationType, typeof Bell> = {
  budget: Wallet, bill: Bell, debt: CreditCard, goal: PiggyBank,
  account: Landmark, import: FileUp, stock: LineChart, system: Info,
}

export default function Notifications() {
  const {
    notifications, markNotificationRead, markAllNotificationsRead,
    deleteNotification, clearNotifications, settings,
  } = useStore()
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = useMemo(() => notifications
    .filter((n) => (filter === 'all' ? true : filter === 'unread' ? !n.read : n.read))
    .filter((n) => typeFilter === 'all' || n.type === typeFilter),
  [notifications, filter, typeFilter])

  const grouped = useMemo(() => {
    const groups: { label: string; items: typeof filtered }[] = []
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    const map = new Map<string, typeof filtered>()
    for (const n of filtered) {
      const d = parseISO(n.date).toDateString()
      const label = d === today ? 'Today' : d === yesterday ? 'Yesterday' : 'Earlier'
      map.set(label, [...(map.get(label) ?? []), n])
    }
    for (const label of ['Today', 'Yesterday', 'Earlier']) {
      const items = map.get(label)
      if (items?.length) groups.push({ label, items })
    }
    return groups
  }, [filtered])

  const prefs = settings.notifications
  const prefRows: [keyof typeof prefs, string][] = [
    ['budgetAlerts', 'Budget alerts'], ['billReminders', 'Bill reminders'],
    ['debtMilestones', 'Debt milestones'], ['goalMilestones', 'Goal milestones'],
    ['importAlerts', 'Import alerts'], ['stockAlerts', 'Stock alerts'],
  ]

  const disabledCount = prefRows.filter(([k]) => !prefs[k]).length

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`${notifications.filter((n) => !n.read).length} unread of ${notifications.length}`}
        actions={
          <>
            <Button variant="outline" onClick={() => { markAllNotificationsRead(); toast.success('All notifications marked as read.') }}>
              <CheckCheck className="mr-1.5 h-4 w-4" />Mark all read
            </Button>
            <Button variant="outline" onClick={() => { clearNotifications(); toast.success('Notifications cleared.') }}>
              <Trash2 className="mr-1.5 h-4 w-4" />Clear all
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="read">Read</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44" aria-label="Filter by type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="budget">Budget</SelectItem>
            <SelectItem value="bill">Bills</SelectItem>
            <SelectItem value="debt">Debt</SelectItem>
            <SelectItem value="goal">Goals</SelectItem>
            <SelectItem value="account">Accounts</SelectItem>
            <SelectItem value="import">Imports</SelectItem>
            <SelectItem value="stock">Stocks</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
        {disabledCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            <BellOff className="h-3.5 w-3.5" />{disabledCount} notification types are muted in Settings
          </span>
        )}
      </div>

      <div className="mt-4 space-y-6">
        {grouped.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title={notifications.length === 0 ? 'No notifications yet' : 'Nothing here'}
            description={notifications.length === 0
              ? 'FinPilot will surface budget alerts, bill reminders, and milestones here.'
              : 'Try a different filter to see more notifications.'}
          />
        ) : (
          grouped.map((g) => (
            <section key={g.label}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</h2>
              <ul className="space-y-2">
                {g.items.map((n) => {
                  const Icon = typeIcons[n.type]
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border bg-card p-4 shadow-card transition-colors',
                        !n.read && 'border-primary/30 bg-accent/40',
                      )}
                    >
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', n.read ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <button className="min-w-0 flex-1 text-left" onClick={() => markNotificationRead(n.id)}>
                        <p className={cn('text-sm', !n.read && 'font-semibold')}>{n.title}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground/80">{formatDistanceToNow(parseISO(n.date), { addSuffix: true })}</p>
                      </button>
                      <div className="flex shrink-0 gap-1">
                        {!n.read && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mark read" onClick={() => markNotificationRead(n.id)}>
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Delete notification" onClick={() => deleteNotification(n.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
