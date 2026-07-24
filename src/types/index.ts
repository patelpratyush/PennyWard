// ─── FinPilot domain types ───────────────────────────────────────────────────

export type AccountType =
  | 'checking' | 'savings' | 'cash' | 'credit_card' | 'auto_loan'
  | 'student_loan' | 'mortgage' | 'personal_loan' | 'investment' | 'other'

export interface Account {
  id: string
  name: string
  institution: string
  type: AccountType
  balance: number // negative = liability
  includeInNetWorth: boolean
  archived: boolean
  lastUpdated: string // ISO date
  creditLimit?: number
  apr?: number
  minimumPayment?: number
  dueDay?: number
  originalBalance?: number
}

export type TransactionType = 'income' | 'expense' | 'transfer'

export interface TransactionSplit {
  id: string
  categoryId: string
  amount: number
  note?: string
}

export interface Transaction {
  id: string
  accountId: string
  type: TransactionType
  amount: number // always positive; direction comes from type
  merchant: string
  description?: string
  date: string // ISO date (transaction date)
  postedDate?: string
  categoryId?: string
  tags: string[]
  notes?: string
  recurring: boolean
  cleared: boolean
  importSource?: 'manual' | 'csv' | 'sample'
  splits?: TransactionSplit[]
  transferAccountId?: string // for transfers
  createdAt: string
}

export interface Category {
  id: string
  name: string
  group: string // Housing, Transportation, Food, Utilities, Lifestyle, Financial, Income
  icon: string // lucide icon name key
  color: string // chart-N token
  archived: boolean
  parentId?: string
}

export interface BudgetEntry {
  categoryId: string
  budgeted: number
  rollover: boolean
}

export interface Budget {
  id: string
  month: string // 'YYYY-MM'
  entries: BudgetEntry[]
  expectedIncome: number
  savingsTarget: number
}

export type DebtType =
  | 'credit_card' | 'auto_loan' | 'student_loan' | 'personal_loan'
  | 'mortgage' | 'medical' | 'bnpl' | 'other'

export interface Debt {
  id: string
  name: string
  lender: string
  type: DebtType
  balance: number // positive number owed
  originalBalance: number
  apr: number
  minimumPayment: number
  dueDay: number
  creditLimit?: number
  accountId?: string
}

export type PayoffStrategy = 'minimum' | 'snowball' | 'avalanche' | 'custom'

export interface PayoffPlan {
  id: string
  name: string
  strategy: PayoffStrategy
  debtIds: string[]
  extraMonthly: number
  oneTimePayment: number
  startMonth: string // 'YYYY-MM'
  customOrder?: string[]
  createdAt: string
}

export type GoalType =
  | 'emergency' | 'vacation' | 'vehicle' | 'home' | 'education'
  | 'wedding' | 'purchase' | 'custom'

export interface GoalContribution {
  id: string
  date: string
  amount: number
  note?: string
}

export interface Goal {
  id: string
  name: string
  type: GoalType
  targetAmount: number
  currentAmount: number
  targetDate: string
  monthlyContribution: number
  accountId?: string
  priority: 'low' | 'medium' | 'high'
  status: 'on_track' | 'behind' | 'completed' | 'paused'
  notes?: string
  contributions: GoalContribution[]
  celebratedMilestones: number[]
}

export type BillFrequency =
  | 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
  | 'semiannual' | 'annual'

export interface Bill {
  id: string
  name: string
  type: string
  amount: number
  dueDay: number
  nextDueDate: string
  accountId?: string
  categoryId?: string
  autopay: boolean
  frequency: BillFrequency
  isIncome: boolean
  paidDates: string[] // ISO dates of paid occurrences
  skippedDates: string[]
  reminderDays: number
}

export interface WatchlistItem {
  ticker: string
  addedAt: string
  addedPrice: number
  note?: string
}

export interface Watchlist {
  id: string
  name: string
  items: WatchlistItem[]
}

export type NotificationType =
  | 'budget' | 'bill' | 'debt' | 'goal' | 'account' | 'import' | 'stock' | 'system'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  date: string
  read: boolean
}

export interface LoanScenario {
  id: string
  name: string
  preferred: boolean
  kind: 'car' | 'general'
  // car inputs
  vehiclePrice: number
  downPayment: number
  tradeInValue: number
  tradeInOwed: number
  rebate: number
  taxRate: number
  docFee: number
  registrationFee: number
  destinationFee: number
  dealerFees: number
  // shared
  loanAmount: number // used for general loans
  apr: number
  termMonths: number
  startDate: string
  extraMonthly: number
  oneTimePayment: number
  createdAt: string
}

export interface UserProfile {
  fullName: string
  preferredName: string
  email: string
  location: string
  currency: string
  timeZone: string
  dateFormat: string
  weekStart: 'sunday' | 'monday'
  budgetStartDay: number
  plan: 'free' | 'pro' | 'household'
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  density: 'comfortable' | 'compact'
  reducedMotion: boolean
  notifications: {
    budgetAlerts: boolean
    billReminders: boolean
    debtMilestones: boolean
    goalMilestones: boolean
    importAlerts: boolean
    stockAlerts: boolean
    productUpdates: boolean
  }
}

export interface OnboardingState {
  completed: boolean
  step: number
  goals: string[]
}

export interface DashboardWidget {
  id: string
  visible: boolean
}

// ─── Calculation result types ────────────────────────────────────────────────

export interface AmortizationRow {
  paymentNumber: number
  date: string
  startingBalance: number
  scheduledPayment: number
  extraPayment: number
  totalPayment: number
  principal: number
  interest: number
  endingBalance: number
  cumulativePrincipal: number
  cumulativeInterest: number
}

export interface LoanResult {
  monthlyPayment: number
  totalInterest: number
  totalPaid: number
  payoffDate: string
  months: number
  schedule: AmortizationRow[]
  interestSaved: number
  monthsSaved: number
}

export interface CarLoanResult extends LoanResult {
  netTradeIn: number
  negativeEquity: number
  taxableAmount: number
  taxes: number
  totalFees: number
  cashDueAtSigning: number
  amountFinanced: number
  totalVehicleCost: number
  standardMonthlyPayment: number
}

export interface DebtPayoffMonth {
  month: string
  rows: {
    debtId: string
    debtName: string
    startingBalance: number
    interest: number
    minimumPaid: number
    extraPaid: number
    endingBalance: number
  }[]
  totalBalance: number
}

export interface DebtPayoffResult {
  strategy: PayoffStrategy
  months: number
  debtFreeDate: string
  totalInterest: number
  totalPaid: number
  payoffOrder: { debtId: string; name: string; month: string }[]
  timeline: DebtPayoffMonth[]
  interestSaved: number
  monthsSaved: number
  firstDebtPaidOff?: string
}
