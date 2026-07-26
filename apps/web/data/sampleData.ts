// ─── Realistic fictional sample data (Pratyush Patel, New Jersey) ────────────
// Generated deterministically around the current date so charts always look fresh.
import { addDays, format, subDays, subMonths } from 'date-fns'
import { round2, uid } from '@/lib/format'
import type {
  Account, AppNotification, Bill, Budget, Category, Debt, Goal,
  LoanScenario, Transaction, UserProfile, Watchlist,
} from '@/types'

export const CURRENT_MONTH = format(new Date(), 'yyyy-MM')
export const TODAY = format(new Date(), 'yyyy-MM-dd')

export const sampleUser: UserProfile = {
  fullName: 'Pratyush Patel',
  preferredName: 'Pratyush',
  email: 'pratyush@example.com',
  location: 'New Jersey',
  currency: 'USD',
  timeZone: 'America/New_York',
  dateFormat: 'MMM d, yyyy',
  weekStart: 'sunday',
  budgetStartDay: 1,
  plan: 'pro',
}

export const sampleAccounts: Account[] = [
  { id: 'acc_checking', name: 'Chase Checking', institution: 'Chase', type: 'checking', balance: 6840, includeInNetWorth: true, archived: false, lastUpdated: TODAY },
  { id: 'acc_savings', name: 'Marcus Savings', institution: 'Marcus by Goldman Sachs', type: 'savings', balance: 18450, includeInNetWorth: true, archived: false, lastUpdated: TODAY, apr: 4.1 },
  { id: 'acc_cash', name: 'Cash Wallet', institution: 'Cash', type: 'cash', balance: 240, includeInNetWorth: true, archived: false, lastUpdated: TODAY },
  { id: 'acc_cc', name: 'Capital One Credit Card', institution: 'Capital One', type: 'credit_card', balance: -2750, includeInNetWorth: true, archived: false, lastUpdated: TODAY, creditLimit: 7500, apr: 24.99, minimumPayment: 95, dueDay: 25, originalBalance: 5200 },
  { id: 'acc_auto', name: 'Honda Auto Loan', institution: 'Honda Financial Services', type: 'auto_loan', balance: -27420, includeInNetWorth: true, archived: false, lastUpdated: TODAY, apr: 5.99, minimumPayment: 647, dueDay: 15, originalBalance: 33500 },
  { id: 'acc_student', name: 'Federal Student Loan', institution: 'Aidvantage', type: 'student_loan', balance: -16800, includeInNetWorth: true, archived: false, lastUpdated: TODAY, apr: 4.75, minimumPayment: 210, dueDay: 20, originalBalance: 24500 },
  { id: 'acc_invest', name: 'Fidelity Investments', institution: 'Fidelity', type: 'investment', balance: 12630, includeInNetWorth: true, archived: false, lastUpdated: TODAY },
]

export const sampleCategories: Category[] = [
  { id: 'cat_rent', name: 'Rent or mortgage', group: 'Housing', icon: 'home', color: 'chart-1', archived: false },
  { id: 'cat_maintenance_home', name: 'Home maintenance', group: 'Housing', icon: 'wrench', color: 'chart-1', archived: false },
  { id: 'cat_car_payment', name: 'Car payment', group: 'Transportation', icon: 'car', color: 'chart-2', archived: false },
  { id: 'cat_fuel', name: 'Fuel', group: 'Transportation', icon: 'fuel', color: 'chart-2', archived: false },
  { id: 'cat_insurance', name: 'Insurance', group: 'Transportation', icon: 'shield', color: 'chart-2', archived: false },
  { id: 'cat_transit', name: 'Public transit', group: 'Transportation', icon: 'train', color: 'chart-2', archived: false },
  { id: 'cat_groceries', name: 'Groceries', group: 'Food', icon: 'shopping-cart', color: 'chart-3', archived: false },
  { id: 'cat_dining', name: 'Dining', group: 'Food', icon: 'utensils', color: 'chart-3', archived: false },
  { id: 'cat_coffee', name: 'Coffee', group: 'Food', icon: 'coffee', color: 'chart-3', archived: false },
  { id: 'cat_electric', name: 'Electricity', group: 'Utilities', icon: 'zap', color: 'chart-4', archived: false },
  { id: 'cat_internet', name: 'Internet', group: 'Utilities', icon: 'wifi', color: 'chart-4', archived: false },
  { id: 'cat_phone', name: 'Mobile phone', group: 'Utilities', icon: 'smartphone', color: 'chart-4', archived: false },
  { id: 'cat_shopping', name: 'Shopping', group: 'Lifestyle', icon: 'shopping-bag', color: 'chart-6', archived: false },
  { id: 'cat_entertainment', name: 'Entertainment', group: 'Lifestyle', icon: 'film', color: 'chart-6', archived: false },
  { id: 'cat_subscriptions', name: 'Subscriptions', group: 'Lifestyle', icon: 'repeat', color: 'chart-6', archived: false },
  { id: 'cat_personal', name: 'Personal care', group: 'Lifestyle', icon: 'sparkles', color: 'chart-6', archived: false },
  { id: 'cat_travel', name: 'Travel', group: 'Lifestyle', icon: 'plane', color: 'chart-6', archived: false },
  { id: 'cat_debt', name: 'Debt payments', group: 'Financial', icon: 'credit-card', color: 'chart-5', archived: false },
  { id: 'cat_savings', name: 'Savings', group: 'Financial', icon: 'piggy-bank', color: 'chart-7', archived: false },
  { id: 'cat_investments', name: 'Investments', group: 'Financial', icon: 'trending-up', color: 'chart-7', archived: false },
  { id: 'cat_health', name: 'Health & pharmacy', group: 'Lifestyle', icon: 'heart-pulse', color: 'chart-8', archived: false },
  { id: 'cat_paycheck', name: 'Paycheck', group: 'Income', icon: 'banknote', color: 'chart-3', archived: false },
  { id: 'cat_interest', name: 'Interest income', group: 'Income', icon: 'percent', color: 'chart-3', archived: false },
]

// Deterministic pseudo-random generator so data is stable across reloads
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface RecurringSpec {
  merchant: string
  amount: number | ((rand: () => number) => number)
  categoryId: string
  accountId: string
  dayOfMonth: number
  type?: 'income' | 'expense'
  recurring?: boolean
}

const recurringSpecs: RecurringSpec[] = [
  { merchant: 'Payroll Deposit — Meridian Health', amount: 3125, categoryId: 'cat_paycheck', accountId: 'acc_checking', dayOfMonth: 1, type: 'income', recurring: true },
  { merchant: 'Payroll Deposit — Meridian Health', amount: 3125, categoryId: 'cat_paycheck', accountId: 'acc_checking', dayOfMonth: 15, type: 'income', recurring: true },
  { merchant: 'Rent Payment — Avalon Communities', amount: 1650, categoryId: 'cat_rent', accountId: 'acc_checking', dayOfMonth: 1, recurring: true },
  { merchant: 'Honda Financial Services', amount: 647, categoryId: 'cat_car_payment', accountId: 'acc_checking', dayOfMonth: 14, recurring: true },
  { merchant: 'Aidvantage Student Loan', amount: 210, categoryId: 'cat_debt', accountId: 'acc_checking', dayOfMonth: 19, recurring: true },
  { merchant: 'Capital One Autopay', amount: 120, categoryId: 'cat_debt', accountId: 'acc_checking', dayOfMonth: 24, recurring: true },
  { merchant: 'GEICO Insurance', amount: 145, categoryId: 'cat_insurance', accountId: 'acc_checking', dayOfMonth: 10, recurring: true },
  { merchant: 'PSE&G Electric', amount: (r) => round2(78 + r() * 55), categoryId: 'cat_electric', accountId: 'acc_checking', dayOfMonth: 17, recurring: true },
  { merchant: 'Xfinity Internet', amount: 69.99, categoryId: 'cat_internet', accountId: 'acc_checking', dayOfMonth: 8, recurring: true },
  { merchant: 'Verizon Wireless', amount: 85, categoryId: 'cat_phone', accountId: 'acc_checking', dayOfMonth: 12, recurring: true },
  { merchant: 'Netflix', amount: 15.49, categoryId: 'cat_subscriptions', accountId: 'acc_cc', dayOfMonth: 21, recurring: true },
  { merchant: 'Spotify', amount: 11.99, categoryId: 'cat_subscriptions', accountId: 'acc_cc', dayOfMonth: 6, recurring: true },
  { merchant: 'Marcus Savings Transfer', amount: 500, categoryId: 'cat_savings', accountId: 'acc_checking', dayOfMonth: 2, recurring: true },
  { merchant: 'Fidelity Contribution', amount: 300, categoryId: 'cat_investments', accountId: 'acc_checking', dayOfMonth: 16, recurring: true },
  { merchant: 'Interest Payment', amount: (r) => round2(52 + r() * 14), categoryId: 'cat_interest', accountId: 'acc_savings', dayOfMonth: 28, type: 'income', recurring: true },
]

const variableSpecs: { merchant: string; categoryId: string; accountId: string; min: number; max: number; perMonth: number }[] = [
  { merchant: 'Whole Foods Market', categoryId: 'cat_groceries', accountId: 'acc_cc', min: 42, max: 138, perMonth: 4 },
  { merchant: 'Trader Joe’s', categoryId: 'cat_groceries', accountId: 'acc_cc', min: 28, max: 86, perMonth: 3 },
  { merchant: 'Shell', categoryId: 'cat_fuel', accountId: 'acc_cc', min: 32, max: 58, perMonth: 3 },
  { merchant: 'Starbucks', categoryId: 'cat_coffee', accountId: 'acc_cc', min: 5.4, max: 12.8, perMonth: 6 },
  { merchant: 'Chipotle', categoryId: 'cat_dining', accountId: 'acc_cc', min: 12, max: 24, perMonth: 3 },
  { merchant: 'Olive Garden', categoryId: 'cat_dining', accountId: 'acc_cc', min: 38, max: 76, perMonth: 1 },
  { merchant: 'Amazon', categoryId: 'cat_shopping', accountId: 'acc_cc', min: 18, max: 145, perMonth: 3 },
  { merchant: 'Target', categoryId: 'cat_shopping', accountId: 'acc_cc', min: 22, max: 96, perMonth: 2 },
  { merchant: 'CVS Pharmacy', categoryId: 'cat_health', accountId: 'acc_cc', min: 9, max: 44, perMonth: 2 },
  { merchant: 'PATH SmartLink', categoryId: 'cat_transit', accountId: 'acc_checking', min: 20, max: 40, perMonth: 2 },
  { merchant: 'AMC Theatres', categoryId: 'cat_entertainment', accountId: 'acc_cc', min: 16, max: 42, perMonth: 1 },
  { merchant: 'Sephora', categoryId: 'cat_personal', accountId: 'acc_cc', min: 18, max: 62, perMonth: 1 },
]

export function generateSampleTransactions(): Transaction[] {
  const rand = mulberry32(42)
  const txs: Transaction[] = []
  const now = new Date()

  for (let m = 5; m >= 0; m--) {
    const monthDate = subMonths(now, m)
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
    const isCurrentMonth = m === 0

    for (const spec of recurringSpecs) {
      if (isCurrentMonth && spec.dayOfMonth > now.getDate()) continue
      const day = Math.min(spec.dayOfMonth, daysInMonth)
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day)
      const amount = typeof spec.amount === 'function' ? spec.amount(rand) : spec.amount
      txs.push({
        id: uid('txn'), accountId: spec.accountId, type: spec.type ?? 'expense',
        amount, merchant: spec.merchant, date: format(date, 'yyyy-MM-dd'),
        categoryId: spec.categoryId, tags: [], recurring: spec.recurring ?? false,
        cleared: true, importSource: 'sample', createdAt: date.toISOString(),
      })
    }

    for (const v of variableSpecs) {
      for (let k = 0; k < v.perMonth; k++) {
        const day = 1 + Math.floor(rand() * daysInMonth)
        if (isCurrentMonth && day > now.getDate()) continue
        const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day)
        txs.push({
          id: uid('txn'), accountId: v.accountId, type: 'expense',
          amount: round2(v.min + rand() * (v.max - v.min)),
          merchant: v.merchant, date: format(date, 'yyyy-MM-dd'),
          categoryId: v.categoryId, tags: [], recurring: false,
          cleared: rand() > 0.15, importSource: 'sample', createdAt: date.toISOString(),
        })
      }
    }
  }
  return txs.sort((a, b) => b.date.localeCompare(a.date))
}

export function generateSampleBudgets(): Budget[] {
  const entries = [
    { categoryId: 'cat_rent', budgeted: 1650, rollover: false },
    { categoryId: 'cat_maintenance_home', budgeted: 75, rollover: true },
    { categoryId: 'cat_car_payment', budgeted: 647, rollover: false },
    { categoryId: 'cat_fuel', budgeted: 180, rollover: false },
    { categoryId: 'cat_insurance', budgeted: 145, rollover: false },
    { categoryId: 'cat_transit', budgeted: 80, rollover: false },
    { categoryId: 'cat_groceries', budgeted: 520, rollover: false },
    { categoryId: 'cat_dining', budgeted: 240, rollover: false },
    { categoryId: 'cat_coffee', budgeted: 60, rollover: false },
    { categoryId: 'cat_electric', budgeted: 120, rollover: false },
    { categoryId: 'cat_internet', budgeted: 70, rollover: false },
    { categoryId: 'cat_phone', budgeted: 85, rollover: false },
    { categoryId: 'cat_shopping', budgeted: 260, rollover: false },
    { categoryId: 'cat_entertainment', budgeted: 90, rollover: false },
    { categoryId: 'cat_subscriptions', budgeted: 45, rollover: false },
    { categoryId: 'cat_personal', budgeted: 70, rollover: false },
    { categoryId: 'cat_health', budgeted: 80, rollover: false },
    { categoryId: 'cat_travel', budgeted: 150, rollover: true },
  ]
  const budgets: Budget[] = []
  const now = new Date()
  for (let m = 2; m >= 0; m--) {
    const month = format(subMonths(now, m), 'yyyy-MM')
    budgets.push({ id: `bud_${month}`, month, entries: entries.map((e) => ({ ...e })), expectedIncome: 6250, savingsTarget: 800 })
  }
  return budgets
}

export const sampleDebts: Debt[] = [
  { id: 'debt_cc', name: 'Capital One Credit Card', lender: 'Capital One', type: 'credit_card', balance: 2750, originalBalance: 5200, apr: 24.99, minimumPayment: 95, dueDay: 25, creditLimit: 7500, accountId: 'acc_cc' },
  { id: 'debt_auto', name: 'Honda Auto Loan', lender: 'Honda Financial Services', type: 'auto_loan', balance: 27420, originalBalance: 33500, apr: 5.99, minimumPayment: 647, dueDay: 15, accountId: 'acc_auto' },
  { id: 'debt_student', name: 'Federal Student Loan', lender: 'Aidvantage', type: 'student_loan', balance: 16800, originalBalance: 24500, apr: 4.75, minimumPayment: 210, dueDay: 20, accountId: 'acc_student' },
]

export const sampleGoals: Goal[] = [
  {
    id: 'goal_emergency', name: 'Emergency Fund', type: 'emergency', targetAmount: 15000, currentAmount: 8000,
    targetDate: '2027-12-31', monthlyContribution: 500, accountId: 'acc_savings', priority: 'high', status: 'on_track',
    notes: 'Six months of essential expenses.', celebratedMilestones: [25, 50],
    contributions: [
      { id: uid('gc'), date: format(subMonths(new Date(), 2), 'yyyy-MM-02'), amount: 500, note: 'Monthly transfer' },
      { id: uid('gc'), date: format(subMonths(new Date(), 1), 'yyyy-MM-02'), amount: 500, note: 'Monthly transfer' },
      { id: uid('gc'), date: format(new Date(), 'yyyy-MM-02'), amount: 500, note: 'Monthly transfer' },
    ],
  },
  {
    id: 'goal_vacation', name: 'Japan Vacation', type: 'vacation', targetAmount: 4000, currentAmount: 1200,
    targetDate: '2027-06-30', monthlyContribution: 150, accountId: 'acc_savings', priority: 'medium', status: 'on_track',
    celebratedMilestones: [25],
    contributions: [
      { id: uid('gc'), date: format(subMonths(new Date(), 1), 'yyyy-MM-10'), amount: 150 },
      { id: uid('gc'), date: format(new Date(), 'yyyy-MM-10'), amount: 150 },
    ],
  },
  {
    id: 'goal_vehicle', name: 'Future Vehicle Down Payment', type: 'vehicle', targetAmount: 10000, currentAmount: 3500,
    targetDate: '2028-01-31', monthlyContribution: 300, accountId: 'acc_savings', priority: 'medium', status: 'behind',
    celebratedMilestones: [25],
    contributions: [
      { id: uid('gc'), date: format(subMonths(new Date(), 3), 'yyyy-MM-05'), amount: 300 },
      { id: uid('gc'), date: format(subMonths(new Date(), 1), 'yyyy-MM-05'), amount: 300 },
    ],
  },
]

export const sampleBills: Bill[] = [
  { id: 'bill_rent', name: 'Rent', type: 'rent', amount: 1650, dueDay: 1, nextDueDate: nextOccurrence(1), accountId: 'acc_checking', categoryId: 'cat_rent', autopay: false, frequency: 'monthly', isIncome: false, paidDates: [], skippedDates: [], reminderDays: 3 },
  { id: 'bill_car', name: 'Honda Auto Loan', type: 'car', amount: 647, dueDay: 15, nextDueDate: nextOccurrence(15), accountId: 'acc_checking', categoryId: 'cat_car_payment', autopay: true, frequency: 'monthly', isIncome: false, paidDates: [], skippedDates: [], reminderDays: 3 },
  { id: 'bill_student', name: 'Student Loan', type: 'student_loan', amount: 210, dueDay: 20, nextDueDate: nextOccurrence(20), accountId: 'acc_checking', categoryId: 'cat_debt', autopay: true, frequency: 'monthly', isIncome: false, paidDates: [], skippedDates: [], reminderDays: 3 },
  { id: 'bill_cc', name: 'Capital One Minimum', type: 'credit_card', amount: 95, dueDay: 25, nextDueDate: nextOccurrence(25), accountId: 'acc_checking', categoryId: 'cat_debt', autopay: true, frequency: 'monthly', isIncome: false, paidDates: [], skippedDates: [], reminderDays: 5 },
  { id: 'bill_electric', name: 'PSE&G Electric', type: 'utilities', amount: 96, dueDay: 18, nextDueDate: nextOccurrence(18), accountId: 'acc_checking', categoryId: 'cat_electric', autopay: false, frequency: 'monthly', isIncome: false, paidDates: [], skippedDates: [], reminderDays: 2 },
  { id: 'bill_internet', name: 'Xfinity Internet', type: 'utilities', amount: 69.99, dueDay: 8, nextDueDate: nextOccurrence(8), accountId: 'acc_checking', categoryId: 'cat_internet', autopay: true, frequency: 'monthly', isIncome: false, paidDates: [], skippedDates: [], reminderDays: 2 },
  { id: 'bill_phone', name: 'Verizon Wireless', type: 'utilities', amount: 85, dueDay: 12, nextDueDate: nextOccurrence(12), accountId: 'acc_checking', categoryId: 'cat_phone', autopay: true, frequency: 'monthly', isIncome: false, paidDates: [], skippedDates: [], reminderDays: 2 },
  { id: 'bill_netflix', name: 'Netflix', type: 'subscription', amount: 15.49, dueDay: 22, nextDueDate: nextOccurrence(22), accountId: 'acc_cc', categoryId: 'cat_subscriptions', autopay: true, frequency: 'monthly', isIncome: false, paidDates: [], skippedDates: [], reminderDays: 1 },
  { id: 'bill_salary', name: 'Paycheck — Meridian Health', type: 'salary', amount: 3125, dueDay: 15, nextDueDate: nextOccurrence(15), accountId: 'acc_checking', autopay: true, frequency: 'monthly', isIncome: true, paidDates: [], skippedDates: [], reminderDays: 0 },
]

function nextOccurrence(day: number): string {
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), day)
  if (thisMonth >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) return format(thisMonth, 'yyyy-MM-dd')
  return format(new Date(now.getFullYear(), now.getMonth() + 1, day), 'yyyy-MM-dd')
}

export function dueDateInMonth(day: number, monthOffset = 0): string {
  const now = new Date()
  return format(new Date(now.getFullYear(), now.getMonth() + monthOffset, day), 'yyyy-MM-dd')
}

export const sampleWatchlists: Watchlist[] = [
  {
    id: 'wl_main', name: 'Core Watchlist',
    items: [
      { ticker: 'AAPL', addedAt: format(subDays(new Date(), 120), 'yyyy-MM-dd'), addedPrice: 198.4, note: 'Long-term hold, watch services growth.' },
      { ticker: 'MSFT', addedAt: format(subDays(new Date(), 90), 'yyyy-MM-dd'), addedPrice: 428.1 },
      { ticker: 'NVDA', addedAt: format(subDays(new Date(), 60), 'yyyy-MM-dd'), addedPrice: 122.7, note: 'Volatile — position sizing matters.' },
      { ticker: 'VTI', addedAt: format(subDays(new Date(), 200), 'yyyy-MM-dd'), addedPrice: 251.3, note: 'Benchmark for total market.' },
      { ticker: 'AMZN', addedAt: format(subDays(new Date(), 30), 'yyyy-MM-dd'), addedPrice: 186.5 },
    ],
  },
]

export const sampleNotifications: AppNotification[] = [
  { id: uid('ntf'), type: 'budget', title: 'Dining budget at 85%', message: 'You have used 85% of your Dining budget for this month.', date: format(subDays(new Date(), 0), "yyyy-MM-dd'T'HH:mm"), read: false },
  { id: uid('ntf'), type: 'bill', title: 'Car payment due soon', message: 'Your Honda auto-loan payment of $647 is due in three days.', date: format(subDays(new Date(), 0), "yyyy-MM-dd'T'HH:mm"), read: false },
  { id: uid('ntf'), type: 'goal', title: 'Emergency Fund reached 50%', message: 'Congratulations — your Emergency Fund goal passed the 50% milestone.', date: format(subDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"), read: false },
  { id: uid('ntf'), type: 'import', title: 'CSV import completed', message: '42 transactions were imported successfully into Chase Checking.', date: format(subDays(new Date(), 2), "yyyy-MM-dd'T'HH:mm"), read: true },
  { id: uid('ntf'), type: 'debt', title: 'Progress milestone', message: 'You have paid down $6,080 of your Honda Auto Loan principal.', date: format(subDays(new Date(), 3), "yyyy-MM-dd'T'HH:mm"), read: true },
  { id: uid('ntf'), type: 'system', title: 'Monthly report ready', message: `Your ${format(subMonths(new Date(), 1), 'MMMM yyyy')} spending report is ready to view.`, date: format(subDays(new Date(), 4), "yyyy-MM-dd'T'HH:mm"), read: true },
  { id: uid('ntf'), type: 'stock', title: 'Stock data delayed', message: 'Stock information is temporarily unavailable. Prices shown may be delayed.', date: format(subDays(new Date(), 5), "yyyy-MM-dd'T'HH:mm"), read: true },
]

export function defaultCarScenario(): Omit<LoanScenario, 'id' | 'createdAt'> {
  return {
    name: '2026 Honda CR-V', preferred: true, kind: 'car',
    vehiclePrice: 38500, downPayment: 5000, tradeInValue: 0, tradeInOwed: 0, rebate: 0,
    taxRate: 6.625, docFee: 399, registrationFee: 240, destinationFee: 1395, dealerFees: 0,
    loanAmount: 0, apr: 5.99, termMonths: 60,
    startDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'), extraMonthly: 100, oneTimePayment: 0,
  }
}

export const sampleScenarios: LoanScenario[] = [
  { id: 'scn_crv', createdAt: new Date().toISOString(), ...defaultCarScenario() },
  {
    id: 'scn_civic', createdAt: new Date().toISOString(), name: '2026 Honda Civic', preferred: false, kind: 'car',
    vehiclePrice: 28950, downPayment: 4000, tradeInValue: 0, tradeInOwed: 0, rebate: 500,
    taxRate: 6.625, docFee: 399, registrationFee: 240, destinationFee: 1145, dealerFees: 0,
    loanAmount: 0, apr: 5.49, termMonths: 48, startDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    extraMonthly: 0, oneTimePayment: 0,
  },
]
