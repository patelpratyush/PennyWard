'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import {
  Bell, Check, Database, Download, Gem, Keyboard, Laptop, Moon, Palette,
  RotateCcw, Shield, Sun, Trash2, Upload, User,
} from 'lucide-react'
import { toast } from 'sonner'
import { exportState, useStore } from '@/stores/useStore'
import { useCategories, useCreateCategory, useUpdateCategory } from '@/hooks/queries/useCategories'
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
    ['productUpdates', 'Product updates', 'Occasional news about FinPilot features.'],
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
                      updateCategoryMutation.mutate({ id: c.id, patch: { archived: !c.archived } })
                      toast.success(c.archived ? 'Category restored.' : 'Category archived — history is preserved.')
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
              createCategory.mutate({ name: newCat.name.trim(), group: newCat.group, icon: newCat.icon, color: 'chart-8' })
              toast.success('Category added.')
              setAddOpen(false)
              setNewCat({ name: '', group: 'Lifestyle', icon: 'shopping-bag' })
            }}>Add category</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SecuritySection() {
  const sessions = [
    { device: 'MacBook Pro — Chrome', location: 'New Jersey, US', current: true },
    { device: 'iPhone 15 — FinPilot Web', location: 'New Jersey, US', current: false },
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
  const { resetToSampleData, clearAllData, importData } = useStore()
  const [confirm, setConfirm] = useState<'reset' | 'clear' | 'delete' | null>(null)
  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Export & backup</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { downloadJSON(`finpilot-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.parse(exportState())); toast.success('Full backup exported as JSON.') }}>
            <Download className="mr-1.5 h-4 w-4" />Export all data (JSON)
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
              else toast.error('That file could not be imported — is it a FinPilot backup?')
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
              {confirm === 'delete' && 'This clears all local data and signs you out. In production this would schedule server-side deletion.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirm === 'reset') { resetToSampleData(); toast.success('Sample data restored.') }
                if (confirm === 'clear') { clearAllData(); toast.success('All data cleared.') }
                if (confirm === 'delete') { clearAllData(); useStore.getState().signOut(); toast.success('Account deleted (demo).') }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SubscriptionSection() {
  const { profile, updateProfile } = useStore()
  const plans = [
    { id: 'free', name: 'Free', price: '$0', features: ['Manual tracking', 'Basic budgeting', '1 payoff plan'] },
    { id: 'pro', name: 'Pro', price: '$8/mo', features: ['CSV imports', 'Unlimited budgets & plans', 'Insights & exports'] },
    { id: 'household', name: 'Household', price: '$14/mo', features: ['Shared dashboard', 'Shared budgets & goals', 'Permissions'] },
  ] as const
  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="text-xl font-bold capitalize">{profile.plan} <Badge className="ml-1 align-middle">{profile.plan === 'free' ? 'Free' : 'Active'}</Badge></p>
            <p className="mt-1 text-xs text-muted-foreground">Renews August 1, 2026 · Visa ending in 4242 (demo)</p>
          </div>
          <Button variant="outline" onClick={() => toast.success('Billing portal would open here in production.')}>Manage billing</Button>
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id} className={cn('shadow-card', profile.plan === p.id && 'border-primary')}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{p.name}</h3>
                {profile.plan === p.id && <Badge>Current</Badge>}
              </div>
              <p className="mt-1 text-2xl font-bold tnum">{p.price}</p>
              <ul className="mt-3 space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="h-3.5 w-3.5 text-success" />{f}</li>
                ))}
              </ul>
              <Button
                className="mt-4 w-full" variant={profile.plan === p.id ? 'outline' : 'default'} disabled={profile.plan === p.id}
                onClick={() => { updateProfile({ plan: p.id }); toast.success(`Switched to the ${p.name} plan (demo).`) }}
              >
                {profile.plan === p.id ? 'Your plan' : `Switch to ${p.name}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function Settings() {
  const params = useParams<{ section?: string }>()
  const section = params.section ?? 'profile'
  const pathname = usePathname()
  return (
    <div>
      <PageHeader title="Settings" description="Profile, appearance, notifications, data, and plan." />
      <div className="grid gap-6 lg:grid-cols-4">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Settings sections">
          {sections.map((s) => (
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
          {section === 'categories' && <CategoriesSection />}
          {section === 'security' && <SecuritySection />}
          {section === 'data' && <DataSection />}
          {section === 'subscription' && <SubscriptionSection />}
        </div>
      </div>
    </div>
  )
}
