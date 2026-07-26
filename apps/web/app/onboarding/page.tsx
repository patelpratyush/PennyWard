'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Banknote, Car, Check, CheckCircle2, CreditCard,
  GraduationCap, Home, Landmark, PiggyBank, Plus, Sparkles, Trash2, Upload, Wallet, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/stores/useStore'
import { formatCurrency, round2 } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AccountType, DebtType } from '@/types'

const goalOptions = [
  'Track spending', 'Build a budget', 'Pay off debt', 'Calculate a car loan',
  'Build savings', 'Monitor investments', 'Improve overall finances',
]

const accountTypes: { type: AccountType; label: string; icon: typeof Landmark; liability?: boolean }[] = [
  { type: 'checking', label: 'Checking', icon: Landmark },
  { type: 'savings', label: 'Savings', icon: PiggyBank },
  { type: 'cash', label: 'Cash', icon: Banknote },
  { type: 'credit_card', label: 'Credit card', icon: CreditCard, liability: true },
  { type: 'auto_loan', label: 'Auto loan', icon: Car, liability: true },
  { type: 'student_loan', label: 'Student loan', icon: GraduationCap, liability: true },
  { type: 'mortgage', label: 'Mortgage', icon: Home, liability: true },
  { type: 'personal_loan', label: 'Personal loan', icon: Wallet, liability: true },
  { type: 'investment', label: 'Investment', icon: Sparkles },
  { type: 'other', label: 'Other', icon: Plus },
]

const budgetPresets = [
  { categoryId: 'cat_rent', label: 'Rent or mortgage', value: 1650 },
  { categoryId: 'cat_groceries', label: 'Groceries', value: 520 },
  { categoryId: 'cat_dining', label: 'Dining', value: 240 },
  { categoryId: 'cat_fuel', label: 'Fuel', value: 180 },
  { categoryId: 'cat_electric', label: 'Electricity', value: 120 },
  { categoryId: 'cat_internet', label: 'Internet', value: 70 },
  { categoryId: 'cat_phone', label: 'Mobile phone', value: 85 },
  { categoryId: 'cat_subscriptions', label: 'Subscriptions', value: 45 },
  { categoryId: 'cat_entertainment', label: 'Entertainment', value: 90 },
  { categoryId: 'cat_shopping', label: 'Shopping', value: 260 },
]

interface DraftAccount { name: string; type: AccountType; balance: number }
interface DraftDebt { name: string; type: DebtType; balance: number; apr: number; minimumPayment: number; dueDay: number }

const stepTitles = ['Your goals', 'Preferences', 'Add accounts', 'Add your data', 'Add debts', 'First budget', 'All set']

export default function Onboarding() {
  const router = useRouter()
  const store = useStore()
  const [step, setStep] = useState(store.onboarding.step || 1)
  const [goals, setGoals] = useState<string[]>(store.onboarding.goals)
  const [prefs, setPrefs] = useState({
    preferredName: store.profile.preferredName,
    currency: store.profile.currency,
    timeZone: store.profile.timeZone,
    dateFormat: store.profile.dateFormat,
    weekStart: store.profile.weekStart as 'sunday' | 'monday',
    budgetStartDay: store.profile.budgetStartDay,
  })
  const [accounts, setAccounts] = useState<DraftAccount[]>([])
  const [debts, setDebts] = useState<DraftDebt[]>([])
  const [dataChoice, setDataChoice] = useState<string>('')
  const [income, setIncome] = useState(6250)
  const [budgetValues, setBudgetValues] = useState<Record<string, number>>(
    Object.fromEntries(budgetPresets.map((b) => [b.categoryId, b.value])))

  const budgetedTotal = useMemo(() => round2(Object.values(budgetValues).reduce((s, v) => s + (v || 0), 0)), [budgetValues])
  const leftToAssign = round2(income - budgetedTotal - 800)

  const go = (next: number) => {
    setStep(next)
    store.setOnboarding({ step: next, goals })
    window.scrollTo({ top: 0 })
  }

  const finish = () => {
    store.updateProfile({ ...prefs })
    for (const a of accounts) {
      store.addAccount({
        name: a.name, institution: a.name, type: a.type,
        balance: accountTypes.find((t) => t.type === a.type)?.liability ? -Math.abs(a.balance) : Math.abs(a.balance),
        includeInNetWorth: true, archived: false,
      })
    }
    for (const d of debts) {
      store.addDebt({ ...d, lender: d.name, originalBalance: d.balance })
    }
    const month = new Date().toISOString().slice(0, 7)
    store.upsertBudget(month, {
      expectedIncome: income,
      savingsTarget: 800,
      entries: Object.entries(budgetValues).map(([categoryId, budgeted]) => ({ categoryId, budgeted, rollover: false })),
    })
    store.completeOnboarding()
    store.pushNotification({ type: 'system', title: 'Welcome to FinPilot', message: 'Your setup is complete — your dashboard is ready.' })
    toast.success('Setup complete — welcome aboard.')
    router.push('/app/dashboard')
  }

  const addAccountDraft = (type: AccountType, label: string) => {
    setAccounts([...accounts, { name: `My ${label}`, type, balance: 0 }])
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="flex h-16 items-center justify-between px-4 sm:px-6">
        <Logo />
        <Button variant="ghost" size="sm" onClick={() => { store.completeOnboarding(); router.push('/app/dashboard') }}>
          Skip setup <X className="ml-1 h-4 w-4" />
        </Button>
      </header>

      {/* Progress stepper */}
      <div className="mx-auto max-w-3xl px-4">
        <ol className="flex items-center" aria-label="Setup progress">
          {stepTitles.map((t, i) => {
            const n = i + 1
            const done = n < step
            const active = n === step
            return (
              <li key={t} className={cn('flex items-center', n < 7 && 'flex-1')}>
                <div className="flex flex-col items-center gap-1.5">
                  <motion.div
                    animate={{ scale: active ? 1.08 : 1 }}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                      done && 'border-primary bg-primary text-primary-foreground',
                      active && 'border-primary bg-background text-primary',
                      !done && !active && 'border-border bg-background text-muted-foreground',
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : n}
                  </motion.div>
                  <span className={cn('hidden text-[11px] font-medium sm:block', active ? 'text-foreground' : 'text-muted-foreground')}>{t}</span>
                </div>
                {n < 7 && (
                  <div className="mx-2 mb-0 h-0.5 flex-1 rounded bg-border sm:mb-5">
                    <motion.div className="h-full rounded bg-primary" animate={{ width: done ? '100%' : '0%' }} transition={{ duration: 0.3 }} />
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8 pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            {/* STEP 1 — goals */}
            {step === 1 && (
              <div>
                <h1 className="text-2xl font-bold">What would you like FinPilot to help with?</h1>
                <p className="mt-1 text-sm text-muted-foreground">Choose all that apply — we’ll tailor your dashboard.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {goalOptions.map((g) => {
                    const selected = goals.includes(g)
                    return (
                      <button
                        key={g}
                        onClick={() => setGoals(selected ? goals.filter((x) => x !== g) : [...goals, g])}
                        className={cn(
                          'flex min-h-[52px] items-center justify-between rounded-xl border bg-card px-4 py-3 text-left text-sm font-medium transition-all hover:shadow-card',
                          selected && 'border-primary bg-accent ring-1 ring-primary',
                        )}
                        aria-pressed={selected}
                      >
                        {g}
                        <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border', selected && 'border-primary bg-primary text-primary-foreground')}>
                          {selected && <Check className="h-3 w-3" />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* STEP 2 — preferences */}
            {step === 2 && (
              <div>
                <h1 className="text-2xl font-bold">Your preferences</h1>
                <p className="mt-1 text-sm text-muted-foreground">You can change any of these later in Settings.</p>
                <Card className="mt-6 shadow-card">
                  <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="pname">Preferred name</Label>
                      <Input id="pname" value={prefs.preferredName} onChange={(e) => setPrefs({ ...prefs, preferredName: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Currency</Label>
                      <Select value={prefs.currency} onValueChange={(v) => setPrefs({ ...prefs, currency: v })}>
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
                      <Select value={prefs.timeZone} onValueChange={(v) => setPrefs({ ...prefs, timeZone: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern (America/New_York)</SelectItem>
                          <SelectItem value="America/Chicago">Central (America/Chicago)</SelectItem>
                          <SelectItem value="America/Denver">Mountain (America/Denver)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific (America/Los_Angeles)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date format</Label>
                      <Select value={prefs.dateFormat} onValueChange={(v) => setPrefs({ ...prefs, dateFormat: v })}>
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
                      <Select value={prefs.weekStart} onValueChange={(v) => setPrefs({ ...prefs, weekStart: v as 'sunday' | 'monday' })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sunday">Sunday</SelectItem>
                          <SelectItem value="monday">Monday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bsd">Monthly budget start day</Label>
                      <Input id="bsd" type="number" min={1} max={28} value={prefs.budgetStartDay}
                        onChange={(e) => setPrefs({ ...prefs, budgetStartDay: Number(e.target.value) })} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* STEP 3 — accounts */}
            {step === 3 && (
              <div>
                <h1 className="text-2xl font-bold">Add your accounts</h1>
                <p className="mt-1 text-sm text-muted-foreground">Pick account types and enter rough balances — estimates are fine.</p>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                  {accountTypes.map((t) => (
                    <button key={t.type} onClick={() => addAccountDraft(t.type, t.label)}
                      className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border bg-card p-3 text-center transition-all hover:border-primary hover:shadow-card">
                      <t.icon className="h-5 w-5 text-primary" />
                      <span className="text-xs font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>
                {accounts.length > 0 && (
                  <div className="mt-6 space-y-3">
                    {accounts.map((a, i) => (
                      <Card key={i} className="shadow-card">
                        <CardContent className="flex flex-wrap items-center gap-3 p-4">
                          <Input value={a.name} onChange={(e) => setAccounts(accounts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="min-w-40 flex-1" aria-label="Account name" />
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-muted-foreground">$</span>
                            <Input type="number" value={a.balance || ''} onChange={(e) => setAccounts(accounts.map((x, j) => (j === i ? { ...x, balance: Number(e.target.value) } : x)))}
                              className="w-32" placeholder="Balance" aria-label="Balance" />
                          </div>
                          <Button variant="ghost" size="icon" aria-label="Remove account" onClick={() => setAccounts(accounts.filter((_, j) => j !== i))}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 4 — data */}
            {step === 4 && (
              <div>
                <h1 className="text-2xl font-bold">Add your financial data</h1>
                <p className="mt-1 text-sm text-muted-foreground">How would you like to bring in transactions?</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    { id: 'csv', icon: Upload, title: 'Upload CSV', desc: 'Import a statement export from your bank.' },
                    { id: 'manual', icon: Plus, title: 'Enter manually', desc: 'Add transactions yourself as you go.' },
                    { id: 'sample', icon: Sparkles, title: 'Use sample data', desc: 'Explore with realistic fictional data.' },
                    { id: 'skip', icon: ArrowRight, title: 'Skip for now', desc: 'Start with a clean slate.' },
                  ].map((o) => (
                    <button key={o.id} onClick={() => setDataChoice(o.id)}
                      className={cn('flex min-h-[96px] items-start gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-card', dataChoice === o.id && 'border-primary bg-accent ring-1 ring-primary')}
                      aria-pressed={dataChoice === o.id}>
                      <o.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span>
                        <span className="block text-sm font-semibold">{o.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{o.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
                {dataChoice === 'csv' && (
                  <p className="mt-4 rounded-lg bg-info-muted px-4 py-3 text-sm text-info">
                    After setup, use Transactions → Import CSV for the full guided import with column mapping and duplicate detection.
                  </p>
                )}
                {dataChoice === 'sample' && (
                  <p className="mt-4 rounded-lg bg-success-muted px-4 py-3 text-sm text-success">
                    Sample transactions, budgets, and goals are already loaded — you can reset them anytime in Settings → Data.
                  </p>
                )}
              </div>
            )}

            {/* STEP 5 — debts */}
            {step === 5 && (
              <div>
                <h1 className="text-2xl font-bold">Add your debts</h1>
                <p className="mt-1 text-sm text-muted-foreground">Credit cards, loans, anything you owe. Add as many as you like.</p>
                <Button variant="outline" className="mt-4" onClick={() => setDebts([...debts, { name: '', type: 'credit_card', balance: 0, apr: 0, minimumPayment: 0, dueDay: 1 }])}>
                  <Plus className="mr-1.5 h-4 w-4" />Add a debt
                </Button>
                <div className="mt-4 space-y-3">
                  {debts.map((d, i) => (
                    <Card key={i} className="shadow-card">
                      <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
                        <div className="space-y-1 sm:col-span-2">
                          <Label>Debt name</Label>
                          <Input value={d.name} placeholder="e.g. Capital One card" onChange={(e) => setDebts(debts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                        </div>
                        <div className="space-y-1">
                          <Label>Type</Label>
                          <Select value={d.type} onValueChange={(v) => setDebts(debts.map((x, j) => (j === i ? { ...x, type: v as DebtType } : x)))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="credit_card">Credit card</SelectItem>
                              <SelectItem value="auto_loan">Auto loan</SelectItem>
                              <SelectItem value="student_loan">Student loan</SelectItem>
                              <SelectItem value="personal_loan">Personal loan</SelectItem>
                              <SelectItem value="mortgage">Mortgage</SelectItem>
                              <SelectItem value="medical">Medical debt</SelectItem>
                              <SelectItem value="bnpl">Buy now, pay later</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Current balance ($)</Label>
                          <Input type="number" value={d.balance || ''} onChange={(e) => setDebts(debts.map((x, j) => (j === i ? { ...x, balance: Number(e.target.value) } : x)))} />
                        </div>
                        <div className="space-y-1">
                          <Label>Interest rate APR (%)</Label>
                          <Input type="number" step="0.01" value={d.apr || ''} onChange={(e) => setDebts(debts.map((x, j) => (j === i ? { ...x, apr: Number(e.target.value) } : x)))} />
                        </div>
                        <div className="space-y-1">
                          <Label>Minimum payment ($)</Label>
                          <Input type="number" value={d.minimumPayment || ''} onChange={(e) => setDebts(debts.map((x, j) => (j === i ? { ...x, minimumPayment: Number(e.target.value) } : x)))} />
                        </div>
                        <div className="flex items-end justify-between sm:col-span-3">
                          <div className="space-y-1">
                            <Label>Due day of month</Label>
                            <Input type="number" min={1} max={31} className="w-28" value={d.dueDay} onChange={(e) => setDebts(debts.map((x, j) => (j === i ? { ...x, dueDay: Number(e.target.value) } : x)))} />
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setDebts(debts.filter((_, j) => j !== i))}>
                            <Trash2 className="mr-1 h-4 w-4" />Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {debts.length === 0 && (
                    <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                      No debts? Great position to be in — you can skip this step.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 6 — budget */}
            {step === 6 && (
              <div>
                <h1 className="text-2xl font-bold">Create your first budget</h1>
                <p className="mt-1 text-sm text-muted-foreground">Adjust these common categories to fit your month.</p>
                <Card className="mt-6 shadow-card">
                  <CardContent className="p-6">
                    <div className="grid gap-3 rounded-xl bg-muted/60 p-4 sm:grid-cols-3">
                      <div>
                        <Label htmlFor="income" className="text-xs">Expected monthly income</Label>
                        <Input id="income" type="number" value={income} onChange={(e) => setIncome(Number(e.target.value))} className="mt-1" />
                      </div>
                      <div className="flex flex-col justify-end">
                        <p className="text-xs text-muted-foreground">Budgeted</p>
                        <p className="text-lg font-bold tnum">{formatCurrency(budgetedTotal, { decimals: 0 })}</p>
                      </div>
                      <div className="flex flex-col justify-end">
                        <p className="text-xs text-muted-foreground">Left to assign (after $800 savings target)</p>
                        <p className={cn('text-lg font-bold tnum', leftToAssign < 0 && 'text-destructive')}>{formatCurrency(leftToAssign, { decimals: 0 })}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {budgetPresets.map((b) => (
                        <div key={b.categoryId} className="flex items-center gap-3">
                          <span className="flex-1 text-sm">{b.label}</span>
                          <Input
                            type="number" className="w-28 text-right" value={budgetValues[b.categoryId] || ''}
                            onChange={(e) => setBudgetValues({ ...budgetValues, [b.categoryId]: Number(e.target.value) })}
                            aria-label={`${b.label} budget`}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* STEP 7 — completion */}
            {step === 7 && (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success-muted"
                >
                  <CheckCircle2 className="h-10 w-10 text-success" />
                </motion.div>
                <h1 className="mt-5 text-2xl font-bold">You’re all set{prefs.preferredName ? `, ${prefs.preferredName}` : ''}.</h1>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Here’s what we’ll prepare on your dashboard:</p>
                <div className="mx-auto mt-6 grid max-w-lg gap-3 text-left sm:grid-cols-2">
                  {[
                    { label: 'Goals chosen', value: goals.length ? goals.join(', ') : 'General finances' },
                    { label: 'Accounts', value: `${accounts.length} added` },
                    { label: 'Debts', value: `${debts.length} added` },
                    { label: 'Budget', value: `${formatCurrency(budgetedTotal, { decimals: 0 })} across ${Object.keys(budgetValues).length} categories` },
                  ].map((s) => (
                    <Card key={s.label} className="shadow-card">
                      <CardContent className="p-4">
                        <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                        <p className="mt-1 line-clamp-2 text-sm font-semibold">{s.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Button size="lg" className="mt-8 h-12 px-8" onClick={finish}>
                  Continue to dashboard <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer nav */}
      {step < 7 && (
        <footer className="fixed inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-18 max-w-3xl items-center justify-between px-4 py-3">
            <Button variant="ghost" onClick={() => go(Math.max(1, step - 1))} disabled={step === 1}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />Back
            </Button>
            <Button onClick={() => go(Math.min(7, step + 1))}>
              {step === 6 ? 'Review setup' : 'Continue'}<ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </footer>
      )}
    </div>
  )
}
