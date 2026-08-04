'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import {
  Bell, Check, Copy, Database, Download, Gem, Keyboard, Laptop, Moon, Palette,
  RotateCcw, Shield, Sun, Trash2, Upload, User, UserMinus, Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { exportState, useStore } from '@/stores/useStore'
import { useCategories, useCreateCategory, useUpdateCategory } from '@/hooks/queries/useCategories'
import { useCategorizationRules, useCreateCategorizationRule, useDeleteCategorizationRule } from '@/hooks/queries/useCategorizationRules'
import { useMe } from '@/hooks/queries/useMe'
import { useHousehold, useCreateHousehold, useCreateInvite, useRemoveMember } from '@/hooks/queries/useHousehold'
import { UpgradeRequiredError, fetchJSON } from '@/lib/fetchJSON'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/Misc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CategoryIcon, categoryIconNames } from '@/components/shared/CategoryIcon'
import { downloadJSON } from '@/lib/format'
import { cn } from '@/lib/utils'

const sections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'categories', label: 'Categories', icon: Database },
  { id: 'security', label: 'Security & sessions', icon: Shield },
  { id: 'data', label: 'Data management', icon: Download },
  { id: 'subscription', label: 'Subscription', icon: Gem },
]

function ProfileSection() {
  const { profile, updateProfile } = useStore()
  const [form, setForm] = useState({ ...profile })
  const dirty = JSON.stringify(form) !== JSON.stringify(profile)
  return (
    <Card className="shadow-card">
      <CardHeader><CardTitle className="text-base">Profile & preferences</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Full name</Label>
            <Input id="s-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-pname">Preferred name</Label>
            <Input id="s-pname" value={form.preferredName} onChange={(e) => setForm({ ...form, preferredName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-email">Email</Label>
            <Input id="s-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-loc">Location</Label>
            <Input id="s-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD — US Dollar</SelectItem>
                <SelectItem value="EUR">EUR — Euro</SelectItem>
                <SelectItem value="GBP">GBP — British Pound</SelectItem>
                <SelectItem value="INR">INR — Indian Rupee</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Time zone</Label>
            <Select value={form.timeZone} onValueChange={(v) => setForm({ ...form, timeZone: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="America/New_York">Eastern</SelectItem>
                <SelectItem value="America/Chicago">Central</SelectItem>
                <SelectItem value="America/Denver">Mountain</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date format</Label>
            <Select value={form.dateFormat} onValueChange={(v) => setForm({ ...form, dateFormat: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MMM d, yyyy">Jul 17, 2026</SelectItem>
                <SelectItem value="MM/dd/yyyy">07/17/2026</SelectItem>
                <SelectItem value="yyyy-MM-dd">2026-07-17</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Week starts on</Label>
            <Select value={form.weekStart} onValueChange={(v) => setForm({ ...form, weekStart: v as 'sunday' | 'monday' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sunday">Sunday</SelectItem>
                <SelectItem value="monday">Monday</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-bsd">Budget start day</Label>
            <Input id="s-bsd" type="number" min={1} max={28} value={form.budgetStartDay} onChange={(e) => setForm({ ...form, budgetStartDay: Number(e.target.value) })} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button disabled={!dirty} onClick={() => { updateProfile(form); toast.success('Profile saved.') }}>Save changes</Button>
          {dirty && <Button variant="ghost" onClick={() => setForm({ ...profile })}>Discard</Button>}
        </div>
      </CardContent>
    </Card>
  )
}

function AppearanceSection() {
  const { settings, updateSettings } = useStore()
  const themes = [
    { id: 'light', label: 'Light', icon: Sun, desc: 'Clean, warm whites' },
    { id: 'dark', label: 'Dark', icon: Moon, desc: 'Deep navy, low glare' },
    { id: 'system', label: 'System', icon: Laptop, desc: 'Follow your device' },
  ] as const
  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Theme</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => { updateSettings({ theme: t.id }); toast.success(`Theme set to ${t.label.toLowerCase()}.`) }}
              className={cn('rounded-xl border p-4 text-left transition-all hover:shadow-card', settings.theme === t.id && 'border-primary bg-accent ring-1 ring-primary')}
              aria-pressed={settings.theme === t.id}
            >
              <t.icon className="h-5 w-5 text-primary" />
              <p className="mt-2 text-sm font-semibold">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </button>
          ))}
        </CardContent>
      </Card>
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Display</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between text-sm">
            <span>
              <span className="block font-medium">Compact density</span>
              <span className="text-xs text-muted-foreground">Tighter spacing across tables and cards.</span>
            </span>
            <Switch
              checked={settings.density === 'compact'}
              onCheckedChange={(v) => updateSettings({ density: v ? 'compact' : 'comfortable' })}
              aria-label="Compact density"
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>
              <span className="block font-medium">Reduce motion</span>
              <span className="text-xs text-muted-foreground">Minimize animations. Also respects your OS setting.</span>
            </span>
            <Switch
              checked={settings.reducedMotion}
              onCheckedChange={(v) => updateSettings({ reducedMotion: v })}
              aria-label="Reduce motion"
            />
          </label>
        </CardContent>
      </Card>
    </div>
  )
}

function NotificationsSection() {
  const { settings, updateSettings } = useStore()
  const n = settings.notifications
  const rows: [keyof typeof n, string, string][] = [
    ['budgetAlerts', 'Budget alerts', 'When you approach or exceed a category budget.'],
    ['billReminders', 'Bill reminders', 'Before due dates, based on each bill’s reminder setting.'],
    ['debtMilestones', 'Debt milestones', 'Principal-payoff achievements and plan updates.'],
    ['goalMilestones', 'Goal milestones', '25 / 50 / 75 / 100% goal progress.'],
    ['importAlerts', 'Import alerts', 'CSV import completions and error reports.'],
    ['stockAlerts', 'Stock alerts', 'Watchlist price movements (demo data).'],
    ['productUpdates', 'Product updates', 'Occasional news about Pennyward features.'],
  ]
  return (
    <Card className="shadow-card">
      <CardHeader><CardTitle className="text-base">Notification preferences</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {rows.map(([key, label, desc]) => (
          <label key={key} className="flex items-center justify-between gap-4 text-sm">
            <span>
              <span className="block font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </span>
            <Switch
              checked={n[key]}
              onCheckedChange={(v) => updateSettings({ notifications: { ...n, [key]: v } })}
              aria-label={label}
            />
          </label>
        ))}
      </CardContent>
    </Card>
  )
}

function CategoriesSection() {
  const categories = useCategories().data ?? []
  const createCategory = useCreateCategory()
  const updateCategoryMutation = useUpdateCategory()
  const [addOpen, setAddOpen] = useState(false)
  const [newCat, setNewCat] = useState({ name: '', group: 'Lifestyle', icon: 'shopping-bag' })
  const groups = [...new Set(categories.map((c) => c.group))]
  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Manage categories</CardTitle>
          <Button size="sm" onClick={() => setAddOpen(true)}>Add category</Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {groups.map((g) => (
            <div key={g}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g}</h3>
              <ul className="space-y-1">
                {categories.filter((c) => c.group === g).map((c) => (
                  <li key={c.id} className={cn('flex items-center gap-3 rounded-lg px-2 py-1.5', c.archived && 'opacity-50')}>
                    <CategoryIcon icon={c.icon} className="text-muted-foreground" />
                    <span className="flex-1 text-sm">{c.name}</span>
                    {c.archived && <Badge variant="secondary" className="text-[10px]">Archived</Badge>}
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                      updateCategoryMutation.mutate({ id: c.id, patch: { archived: !c.archived } }, {
                        onSuccess: () => toast.success(c.archived ? 'Category restored.' : 'Category archived — history is preserved.'),
                        onError: () => toast.error('Could not archive/restore this category.'),
                      })
                    }}>
                      {c.archived ? 'Restore' : 'Archive'}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Archiving a category hides it from pickers but keeps historical transactions and budgets intact.</p>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Category name" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} aria-label="Category name" />
            <Select value={newCat.group} onValueChange={(v) => setNewCat({ ...newCat, group: v })}>
              <SelectTrigger aria-label="Group"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Housing', 'Transportation', 'Food', 'Utilities', 'Lifestyle', 'Financial', 'Income'].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Icon</p>
              <div className="grid grid-cols-8 gap-1">
                {categoryIconNames.map((icon) => (
                  <button key={icon} onClick={() => setNewCat({ ...newCat, icon })}
                    className={cn('flex h-9 items-center justify-center rounded-lg border hover:bg-muted', newCat.icon === icon && 'border-primary bg-accent')}
                    aria-label={`Icon ${icon}`} aria-pressed={newCat.icon === icon}>
                    <CategoryIcon icon={icon} />
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" disabled={newCat.name.trim().length < 2} onClick={() => {
              createCategory.mutate({ name: newCat.name.trim(), group: newCat.group, icon: newCat.icon, color: 'chart-8' }, {
                onSuccess: () => {
                  toast.success('Category added.')
                  setAddOpen(false)
                  setNewCat({ name: '', group: 'Lifestyle', icon: 'shopping-bag' })
                },
                onError: () => toast.error('Could not add this category. Please try again.'),
              })
            }}>Add category</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RulesSection() {
  const categories = useCategories().data ?? []
  const rules = useCategorizationRules().data ?? []
  const createRule = useCreateCategorizationRule()
  const deleteRule = useDeleteCategorizationRule()
  const [form, setForm] = useState({ matchType: 'contains' as 'contains' | 'equals' | 'regex', pattern: '', categoryId: '', priority: 0 })
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Unknown'
  return (
    <Card className="shadow-card">
      <CardHeader><CardTitle className="text-base">Categorization rules</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-1">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm">
              <Badge variant="secondary" className="text-[10px] uppercase">{r.matchType}</Badge>
              <span className="flex-1 truncate">{r.pattern}</span>
              <span className="text-xs text-muted-foreground">{categoryName(r.categoryId)}</span>
              <span className="text-xs text-muted-foreground">priority {r.priority}</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                deleteRule.mutate(r.id, {
                  onSuccess: () => toast.success('Rule deleted.'),
                  onError: () => toast.error('Could not delete this rule.'),
                })
              }}>
                Delete
              </Button>
            </li>
          ))}
          {rules.length === 0 && <p className="text-xs text-muted-foreground">No categorization rules yet.</p>}
        </ul>
        <div className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <div className="space-y-1.5">
            <Label>Match type</Label>
            <Select value={form.matchType} onValueChange={(v) => setForm({ ...form, matchType: v as typeof form.matchType })}>
              <SelectTrigger aria-label="Match type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="regex">Regex</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rule-pattern">Pattern</Label>
            <Input id="rule-pattern" value={form.pattern} onChange={(e) => setForm({ ...form, pattern: e.target.value })} placeholder="e.g. starbucks" />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
              <SelectTrigger aria-label="Category"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rule-priority">Priority</Label>
            <Input id="rule-priority" type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
          </div>
        </div>
        <Button
          disabled={form.pattern.trim().length < 1 || !form.categoryId}
          onClick={() => {
            createRule.mutate(
              { matchType: form.matchType, pattern: form.pattern.trim(), categoryId: form.categoryId, priority: form.priority },
              {
                onSuccess: () => {
                  toast.success('Rule added.')
                  setForm({ matchType: 'contains', pattern: '', categoryId: '', priority: 0 })
                },
                onError: () => toast.error('Could not add this rule.'),
              },
            )
          }}
        >
          Add rule
        </Button>
      </CardContent>
    </Card>
  )
}

function SecuritySection() {
  const sessions = [
    { device: 'MacBook Pro — Chrome', location: 'New Jersey, US', current: true },
    { device: 'iPhone 15 — Pennyward Web', location: 'New Jersey, US', current: false },
  ]
  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Password & authentication</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sec-current">Current password</Label>
              <Input id="sec-current" type="password" autoComplete="current-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sec-new">New password</Label>
              <Input id="sec-new" type="password" autoComplete="new-password" />
            </div>
          </div>
          <Button variant="outline" onClick={() => toast.success('Password updated (demo).')}>Change password</Button>
          <label className="flex items-center justify-between text-sm">
            <span>
              <span className="block font-medium">Two-factor authentication</span>
              <span className="text-xs text-muted-foreground">Authenticator-app codes. Roadmap item in this demo.</span>
            </span>
            <Switch disabled aria-label="Two-factor authentication (coming soon)" />
          </label>
        </CardContent>
      </Card>
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Active sessions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {sessions.map((s) => (
            <div key={s.device} className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">{s.device} {s.current && <Badge className="ml-1 text-[10px]">This device</Badge>}</p>
                <p className="text-xs text-muted-foreground">{s.location}</p>
              </div>
              {!s.current && <Button variant="ghost" size="sm" onClick={() => toast.success('Session signed out.')}>Sign out</Button>}
            </div>
          ))}
          <Button variant="outline" onClick={() => toast.success('All other sessions signed out.')}>Sign out other devices</Button>
        </CardContent>
      </Card>
    </div>
  )
}

function DataSection() {
  const router = useRouter()
  const { data: me } = useMe()
  const exportAllowed = me?.limits.dataExport ?? true
  const { resetToSampleData, clearAllData, importData } = useStore()
  const [confirm, setConfirm] = useState<'reset' | 'clear' | 'delete' | null>(null)
  const [deleting, setDeleting] = useState(false)

  const deleteAccount = async () => {
    setDeleting(true)
    try {
      await fetchJSON('/api/account', { method: 'DELETE' })
      clearAllData()
      await createClient().auth.signOut()
      toast.success('Account deleted.')
      router.push('/')
      router.refresh()
    } catch {
      toast.error('Could not delete your account. Please try again or contact support.')
      setDeleting(false)
      setConfirm(null)
    }
  }

  const exportBackup = () => {
    if (!exportAllowed) {
      toast.error('Data export is a Pro feature.', { action: { label: 'See plans', onClick: () => router.push('/pricing') } })
      return
    }
    downloadJSON(`pennyward-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.parse(exportState()))
    toast.success('Full backup exported as JSON.')
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Export & backup</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportBackup}>
            <Download className="mr-1.5 h-4 w-4" />{exportAllowed ? 'Export all data (JSON)' : 'Export all data (Pro)'}
          </Button>
          <Button variant="outline" onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.json'
            input.onchange = async () => {
              const file = input.files?.[0]
              if (!file) return
              const text = await file.text()
              if (importData(text)) toast.success('Backup restored.')
              else toast.error('That file could not be imported — is it a Pennyward backup?')
            }
            input.click()
          }}>
            <Upload className="mr-1.5 h-4 w-4" />Restore from backup
          </Button>
        </CardContent>
      </Card>
      <Card className="border-destructive/30 shadow-card">
        <CardHeader><CardTitle className="text-base text-destructive">Danger zone</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setConfirm('reset')}><RotateCcw className="mr-1.5 h-4 w-4" />Reset to sample data</Button>
          <Button variant="outline" onClick={() => setConfirm('clear')}><Trash2 className="mr-1.5 h-4 w-4" />Clear all data</Button>
          <Button variant="destructive" onClick={() => setConfirm('delete')}>Delete account</Button>
        </CardContent>
      </Card>

      <AlertDialog open={!!confirm} onOpenChange={() => setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'reset' ? 'Reset to sample data?' : confirm === 'clear' ? 'Clear all data?' : 'Delete your account?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'reset' && 'This replaces everything with the original demo dataset. Export a backup first if needed.'}
              {confirm === 'clear' && 'This removes all accounts, transactions, budgets, debts, goals, and bills from this browser.'}
              {confirm === 'delete' && 'This permanently deletes your account and every account, transaction, budget, and debt tied to it. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={() => {
                if (confirm === 'reset') { resetToSampleData(); toast.success('Sample data restored.'); setConfirm(null) }
                if (confirm === 'clear') { clearAllData(); toast.success('All data cleared.'); setConfirm(null) }
                if (confirm === 'delete') deleteAccount()
              }}
            >
              {confirm === 'delete' && deleting ? 'Deleting…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SubscriptionSection() {
  // Real DB plan, not the old localStorage profile.plan — that field could be
  // edited directly in devtools to grant any tier, since nothing checked it
  // server-side. There is no self-serve upgrade flow (no billing integration
  // yet), so this section is read-only: it shows what plan you actually have
  // and points at Pricing rather than offering a button that fakes a switch.
  const { data: me, isLoading } = useMe()
  const plans = [
    { id: 'free', name: 'Free', price: '$0', features: ['Manual tracking', 'Basic budgeting', '1 saved payoff plan', '1 budget month'] },
    { id: 'pro', name: 'Pro', price: '$8/mo', features: ['CSV imports', 'Unlimited budgets & payoff plans', 'Goals, watchlists & data export'] },
    { id: 'household', name: 'Household', price: '$14/mo', features: ['Everything in Pro', 'Shared dashboard (coming soon)', 'Multiple members (coming soon)'] },
  ] as const

  if (isLoading || !me) return <div className="h-40 animate-pulse rounded-lg bg-muted" />

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="text-xl font-bold capitalize">{me.plan} <Badge className="ml-1 align-middle">{me.plan === 'free' ? 'Free' : 'Active'}</Badge></p>
            <p className="mt-1 text-xs text-muted-foreground">
              No billing is set up yet — plan changes are handled manually. <Link href="/pricing" className="underline">See plan details</Link>.
            </p>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id} className={cn('shadow-card', me.plan === p.id && 'border-primary')}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{p.name}</h3>
                {me.plan === p.id && <Badge>Current</Badge>}
              </div>
              <p className="mt-1 text-2xl font-bold tnum">{p.price}</p>
              <ul className="mt-3 space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="h-3.5 w-3.5 text-success" />{f}</li>
                ))}
              </ul>
              {me.plan !== p.id && (
                <Button asChild className="mt-4 w-full" variant="outline">
                  <Link href="/pricing">Learn more</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function HouseholdSection() {
  const { data: household, isLoading } = useHousehold()
  const createHousehold = useCreateHousehold()
  const createInvite = useCreateInvite()
  const removeMember = useRemoveMember()
  const [name, setName] = useState('Our household')
  const [inviteEmail, setInviteEmail] = useState('')
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null)

  if (isLoading) return <div className="h-40 animate-pulse rounded-lg bg-muted" />

  if (!household) {
    return (
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Create a household</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Share budgets with the people you live with.</p>
          <div className="flex max-w-sm gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Household name" />
            <Button
              disabled={!name.trim() || createHousehold.isPending}
              onClick={() => createHousehold.mutate(name.trim(), {
                onSuccess: () => toast.success('Household created.'),
                onError: (err) => {
                  if (err instanceof UpgradeRequiredError) { toast.error(err.message); return }
                  toast.error('Could not create household.')
                },
              })}
            >
              Create
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">{household.name}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {household.members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{m.name ?? m.email ?? m.userId}</p>
                <p className="text-xs capitalize text-muted-foreground">{m.role}</p>
              </div>
              {household.role === 'owner' && m.role !== 'owner' && (
                <Button
                  variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                  aria-label="Remove member"
                  onClick={() => removeMember.mutate(m.userId, {
                    onSuccess: () => toast.success('Member removed.'),
                    onError: () => toast.error('Could not remove member.'),
                  })}
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {household.role === 'owner' && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Invite a member</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex max-w-sm gap-2">
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="them@example.com" />
              <Button
                disabled={!inviteEmail.trim() || createInvite.isPending}
                onClick={() => createInvite.mutate(inviteEmail.trim(), {
                  onSuccess: (invite) => {
                    setLastInviteLink(`${window.location.origin}/app/invite/${invite.token}`)
                    setInviteEmail('')
                    toast.success('Invite created — share the link below.')
                  },
                  onError: () => toast.error('Could not create invite.'),
                })}
              >
                Create invite
              </Button>
            </div>
            {lastInviteLink && (
              <div className="flex items-center gap-2 rounded-lg bg-muted p-2.5 text-xs">
                <code className="flex-1 truncate">{lastInviteLink}</code>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => { navigator.clipboard.writeText(lastInviteLink); toast.success('Link copied.') }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Invites expire after 7 days. No email is sent yet — share the link directly.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function Settings() {
  const params = useParams<{ section?: string }>()
  const section = params.section ?? 'profile'
  const pathname = usePathname()
  const { data: me } = useMe()
  const visibleSections = me?.plan === 'household'
    ? [...sections, { id: 'household', label: 'Household', icon: Users }]
    : sections
  return (
    <div>
      <PageHeader title="Settings" description="Profile, appearance, notifications, data, and plan." />
      <div className="grid gap-6 lg:grid-cols-4">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Settings sections">
          {visibleSections.map((s) => (
            <Link
              key={s.id}
              href={`/app/settings/${s.id}`}
              className={cn(
                'flex min-w-max items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                pathname === `/app/settings/${s.id}` && 'bg-accent text-accent-foreground',
              )}
            >
              <s.icon className="h-4 w-4" />{s.label}
            </Link>
          ))}
          <div className="mt-2 hidden rounded-xl bg-muted/50 p-3 lg:block">
            <p className="flex items-center gap-1.5 text-xs font-semibold"><Keyboard className="h-3.5 w-3.5" />Shortcuts</p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li><kbd className="rounded border bg-background px-1">⌘K</kbd> global search</li>
              <li><kbd className="rounded border bg-background px-1">Esc</kbd> close dialogs</li>
            </ul>
          </div>
        </nav>
        <div className="lg:col-span-3">
          {section === 'profile' && <ProfileSection />}
          {section === 'appearance' && <AppearanceSection />}
          {section === 'notifications' && <NotificationsSection />}
          {section === 'categories' && (
            <div className="space-y-4">
              <CategoriesSection />
              <RulesSection />
            </div>
          )}
          {section === 'security' && <SecuritySection />}
          {section === 'data' && <DataSection />}
          {section === 'subscription' && <SubscriptionSection />}
          {section === 'household' && <HouseholdSection />}
        </div>
      </div>
    </div>
  )
}
