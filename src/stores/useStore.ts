// ─── FinPilot global store — Zustand + localStorage persistence ─────────────
// All mutations live here. To connect the future FastAPI backend, keep these
// action signatures and swap the internals for API calls (see services/api.ts).
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from '@/lib/format'
import {
  generateSampleBudgets, generateSampleTransactions, sampleAccounts, sampleBills,
  sampleCategories, sampleDebts, sampleGoals, sampleNotifications, sampleScenarios,
  sampleUser, sampleWatchlists,
} from '@/data/sampleData'
import type {
  Account, AppNotification, AppSettings, Bill, Budget, Category, DashboardWidget,
  Debt, Goal, LoanScenario, OnboardingState, PayoffPlan, Transaction, UserProfile, Watchlist,
} from '@/types'

export interface FinPilotState {
  signedIn: boolean
  profile: UserProfile
  settings: AppSettings
  onboarding: OnboardingState
  accounts: Account[]
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  debts: Debt[]
  payoffPlans: PayoffPlan[]
  goals: Goal[]
  bills: Bill[]
  watchlists: Watchlist[]
  notifications: AppNotification[]
  scenarios: LoanScenario[]
  dashboardWidgets: DashboardWidget[]

  // auth (frontend-only mock)
  signIn: (email: string) => void
  signOut: () => void
  completeOnboarding: () => void
  setOnboarding: (patch: Partial<OnboardingState>) => void

  // profile & settings
  updateProfile: (patch: Partial<UserProfile>) => void
  updateSettings: (patch: Partial<AppSettings>) => void

  // accounts
  addAccount: (a: Omit<Account, 'id' | 'lastUpdated'>) => void
  updateAccount: (id: string, patch: Partial<Account>) => void
  deleteAccount: (id: string) => void

  // transactions
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void
  addTransactions: (ts: Omit<Transaction, 'id' | 'createdAt'>[]) => number
  updateTransaction: (id: string, patch: Partial<Transaction>) => void
  deleteTransactions: (ids: string[]) => void

  // categories
  addCategory: (c: Omit<Category, 'id'>) => void
  updateCategory: (id: string, patch: Partial<Category>) => void

  // budgets
  upsertBudget: (month: string, patch: Partial<Omit<Budget, 'id' | 'month'>>) => void
  updateBudgetEntry: (month: string, categoryId: string, budgeted: number) => void
  addBudgetEntry: (month: string, categoryId: string, budgeted: number) => void
  removeBudgetEntry: (month: string, categoryId: string) => void
  copyBudget: (fromMonth: string, toMonth: string) => void

  // debts & plans
  addDebt: (d: Omit<Debt, 'id'>) => void
  updateDebt: (id: string, patch: Partial<Debt>) => void
  deleteDebt: (id: string) => void
  addPayoffPlan: (p: Omit<PayoffPlan, 'id' | 'createdAt'>) => void
  deletePayoffPlan: (id: string) => void

  // goals
  addGoal: (g: Omit<Goal, 'id' | 'contributions' | 'celebratedMilestones'>) => void
  updateGoal: (id: string, patch: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  addContribution: (goalId: string, amount: number, note?: string) => void

  // bills
  addBill: (b: Omit<Bill, 'id' | 'paidDates' | 'skippedDates'>) => void
  updateBill: (id: string, patch: Partial<Bill>) => void
  deleteBill: (id: string) => void
  markBillPaid: (id: string, date: string) => void
  skipBill: (id: string, date: string) => void

  // watchlists
  addWatchlist: (name: string) => void
  renameWatchlist: (id: string, name: string) => void
  deleteWatchlist: (id: string) => void
  addToWatchlist: (id: string, ticker: string, price: number) => void
  removeFromWatchlist: (id: string, ticker: string) => void
  updateWatchlistNote: (id: string, ticker: string, note: string) => void

  // notifications
  pushNotification: (n: Omit<AppNotification, 'id' | 'date' | 'read'>) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  deleteNotification: (id: string) => void
  clearNotifications: () => void

  // scenarios
  addScenario: (s: Omit<LoanScenario, 'id' | 'createdAt'>) => string
  updateScenario: (id: string, patch: Partial<LoanScenario>) => void
  deleteScenario: (id: string) => void

  // dashboard
  setDashboardWidgets: (w: DashboardWidget[]) => void

  // data management
  resetToSampleData: () => void
  clearAllData: () => void
  importData: (json: string) => boolean
}

export const defaultWidgets: DashboardWidget[] = [
  { id: 'summary', visible: true },
  { id: 'cashflow', visible: true },
  { id: 'categories', visible: true },
  { id: 'budget', visible: true },
  { id: 'debt', visible: true },
  { id: 'bills', visible: true },
  { id: 'goals', visible: true },
  { id: 'transactions', visible: true },
  { id: 'insights', visible: true },
  { id: 'stocks', visible: true },
]

export const defaultSettings: AppSettings = {
  theme: 'system',
  density: 'comfortable',
  reducedMotion: false,
  notifications: {
    budgetAlerts: true, billReminders: true, debtMilestones: true,
    goalMilestones: true, importAlerts: true, stockAlerts: false, productUpdates: true,
  },
}

function sampleState() {
  return {
    signedIn: false,
    profile: sampleUser,
    settings: defaultSettings,
    onboarding: { completed: false, step: 1, goals: [] as string[] },
    accounts: sampleAccounts,
    transactions: generateSampleTransactions(),
    categories: sampleCategories,
    budgets: generateSampleBudgets(),
    debts: sampleDebts,
    payoffPlans: [] as PayoffPlan[],
    goals: sampleGoals,
    bills: sampleBills,
    watchlists: sampleWatchlists,
    notifications: sampleNotifications,
    scenarios: sampleScenarios,
    dashboardWidgets: defaultWidgets,
  }
}

export const useStore = create<FinPilotState>()(
  persist(
    (set, get) => ({
      ...sampleState(),

      signIn: (email) => set({ signedIn: true, profile: { ...get().profile, email } }),
      signOut: () => set({ signedIn: false }),
      completeOnboarding: () => set({ onboarding: { ...get().onboarding, completed: true } }),
      setOnboarding: (patch) => set({ onboarding: { ...get().onboarding, ...patch } }),

      updateProfile: (patch) => set({ profile: { ...get().profile, ...patch } }),
      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

      addAccount: (a) => set({ accounts: [...get().accounts, { ...a, id: uid('acc'), lastUpdated: new Date().toISOString().slice(0, 10) }] }),
      updateAccount: (id, patch) => set({ accounts: get().accounts.map((a) => (a.id === id ? { ...a, ...patch, lastUpdated: new Date().toISOString().slice(0, 10) } : a)) }),
      deleteAccount: (id) => set({ accounts: get().accounts.filter((a) => a.id !== id) }),

      addTransaction: (t) => set({ transactions: [{ ...t, id: uid('txn'), createdAt: new Date().toISOString() }, ...get().transactions] }),
      addTransactions: (ts) => {
        const stamped = ts.map((t) => ({ ...t, id: uid('txn'), createdAt: new Date().toISOString() }))
        set({ transactions: [...stamped, ...get().transactions] })
        return stamped.length
      },
      updateTransaction: (id, patch) => set({ transactions: get().transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) }),
      deleteTransactions: (ids) => set({ transactions: get().transactions.filter((t) => !ids.includes(t.id)) }),

      addCategory: (c) => set({ categories: [...get().categories, { ...c, id: uid('cat') }] }),
      updateCategory: (id, patch) => set({ categories: get().categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }),

      upsertBudget: (month, patch) => {
        const budgets = get().budgets
        const existing = budgets.find((b) => b.month === month)
        if (existing) {
          set({ budgets: budgets.map((b) => (b.month === month ? { ...b, ...patch } : b)) })
        } else {
          set({ budgets: [...budgets, { id: uid('bud'), month, entries: [], expectedIncome: 6250, savingsTarget: 800, ...patch }] })
        }
      },
      updateBudgetEntry: (month, categoryId, budgeted) => {
        const budgets = get().budgets
        const budget = budgets.find((b) => b.month === month)
        if (!budget) {
          get().upsertBudget(month, { entries: [{ categoryId, budgeted, rollover: false }] })
          return
        }
        const entries = budget.entries.some((e) => e.categoryId === categoryId)
          ? budget.entries.map((e) => (e.categoryId === categoryId ? { ...e, budgeted } : e))
          : [...budget.entries, { categoryId, budgeted, rollover: false }]
        set({ budgets: budgets.map((b) => (b.month === month ? { ...b, entries } : b)) })
      },
      addBudgetEntry: (month, categoryId, budgeted) => get().updateBudgetEntry(month, categoryId, budgeted),
      removeBudgetEntry: (month, categoryId) => {
        set({
          budgets: get().budgets.map((b) =>
            b.month === month ? { ...b, entries: b.entries.filter((e) => e.categoryId !== categoryId) } : b),
        })
      },
      copyBudget: (fromMonth, toMonth) => {
        const from = get().budgets.find((b) => b.month === fromMonth)
        if (!from) return
        get().upsertBudget(toMonth, {
          entries: from.entries.map((e) => ({ ...e })),
          expectedIncome: from.expectedIncome,
          savingsTarget: from.savingsTarget,
        })
      },

      addDebt: (d) => set({ debts: [...get().debts, { ...d, id: uid('debt') }] }),
      updateDebt: (id, patch) => set({ debts: get().debts.map((d) => (d.id === id ? { ...d, ...patch } : d)) }),
      deleteDebt: (id) => set({ debts: get().debts.filter((d) => d.id !== id) }),
      addPayoffPlan: (p) => set({ payoffPlans: [...get().payoffPlans, { ...p, id: uid('plan'), createdAt: new Date().toISOString() }] }),
      deletePayoffPlan: (id) => set({ payoffPlans: get().payoffPlans.filter((p) => p.id !== id) }),

      addGoal: (g) => set({ goals: [...get().goals, { ...g, id: uid('goal'), contributions: [], celebratedMilestones: [] }] }),
      updateGoal: (id, patch) => set({ goals: get().goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }),
      deleteGoal: (id) => set({ goals: get().goals.filter((g) => g.id !== id) }),
      addContribution: (goalId, amount, note) => set({
        goals: get().goals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                currentAmount: Math.round((g.currentAmount + amount) * 100) / 100,
                contributions: [...g.contributions, { id: uid('gc'), date: new Date().toISOString().slice(0, 10), amount, note }],
              }
            : g),
      }),

      addBill: (b) => set({ bills: [...get().bills, { ...b, id: uid('bill'), paidDates: [], skippedDates: [] }] }),
      updateBill: (id, patch) => set({ bills: get().bills.map((b) => (b.id === id ? { ...b, ...patch } : b)) }),
      deleteBill: (id) => set({ bills: get().bills.filter((b) => b.id !== id) }),
      markBillPaid: (id, date) => set({ bills: get().bills.map((b) => (b.id === id ? { ...b, paidDates: [...b.paidDates, date] } : b)) }),
      skipBill: (id, date) => set({ bills: get().bills.map((b) => (b.id === id ? { ...b, skippedDates: [...b.skippedDates, date] } : b)) }),

      addWatchlist: (name) => set({ watchlists: [...get().watchlists, { id: uid('wl'), name, items: [] }] }),
      renameWatchlist: (id, name) => set({ watchlists: get().watchlists.map((w) => (w.id === id ? { ...w, name } : w)) }),
      deleteWatchlist: (id) => set({ watchlists: get().watchlists.filter((w) => w.id !== id) }),
      addToWatchlist: (id, ticker, price) => set({
        watchlists: get().watchlists.map((w) =>
          w.id === id && !w.items.some((i) => i.ticker === ticker)
            ? { ...w, items: [...w.items, { ticker, addedAt: new Date().toISOString().slice(0, 10), addedPrice: price }] }
            : w),
      }),
      removeFromWatchlist: (id, ticker) => set({
        watchlists: get().watchlists.map((w) => (w.id === id ? { ...w, items: w.items.filter((i) => i.ticker !== ticker) } : w)),
      }),
      updateWatchlistNote: (id, ticker, note) => set({
        watchlists: get().watchlists.map((w) =>
          w.id === id ? { ...w, items: w.items.map((i) => (i.ticker === ticker ? { ...i, note } : i)) } : w),
      }),

      pushNotification: (n) => set({
        notifications: [{ ...n, id: uid('ntf'), date: new Date().toISOString(), read: false }, ...get().notifications],
      }),
      markNotificationRead: (id) => set({ notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }),
      markAllNotificationsRead: () => set({ notifications: get().notifications.map((n) => ({ ...n, read: true })) }),
      deleteNotification: (id) => set({ notifications: get().notifications.filter((n) => n.id !== id) }),
      clearNotifications: () => set({ notifications: [] }),

      addScenario: (s) => {
        const id = uid('scn')
        set({ scenarios: [...get().scenarios, { ...s, id, createdAt: new Date().toISOString() }] })
        return id
      },
      updateScenario: (id, patch) => set({ scenarios: get().scenarios.map((s) => (s.id === id ? { ...s, ...patch } : s)) }),
      deleteScenario: (id) => set({ scenarios: get().scenarios.filter((s) => s.id !== id) }),

      setDashboardWidgets: (w) => set({ dashboardWidgets: w }),

      resetToSampleData: () => set(sampleState()),
      clearAllData: () => set({
        ...sampleState(),
        accounts: [], transactions: [], budgets: [], debts: [], payoffPlans: [],
        goals: [], bills: [], notifications: [], scenarios: [], categories: sampleCategories,
      }),
      importData: (json) => {
        try {
          const data = JSON.parse(json)
          if (!data || typeof data !== 'object') return false
          set({ ...get(), ...data })
          return true
        } catch {
          return false
        }
      },
    }),
    { name: 'finpilot-store-v1' },
  ),
)

/** Export entire persisted state as JSON (data management page). */
export function exportState(): string {
  const s = useStore.getState()
  const { signedIn, ...rest } = s
  const data: Record<string, unknown> = { signedIn }
  for (const key of Object.keys(rest)) {
    const v = (rest as Record<string, unknown>)[key]
    if (typeof v !== 'function') data[key] = v
  }
  return JSON.stringify(data, null, 2)
}
