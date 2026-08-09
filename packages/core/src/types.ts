// Local, minimal structural types — deliberately not imported from the web
// app's types/index.ts so this package has zero dependency on any app or
// framework. The web app's richer Debt/Budget/Goal/Account/Transaction types
// are supersets of these shapes and satisfy them structurally with no casts.

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

export type PayoffStrategy = 'minimum' | 'snowball' | 'avalanche' | 'custom'

export interface DebtLike {
  id: string
  name: string
  balance: number // positive number owed
  apr: number
  minimumPayment: number
}

/** A one-time payment scheduled for an arbitrary future month, optionally
 * targeted at a specific debt (R4.7 — "$3k bonus on the car loan in
 * December"). `month` is 1-indexed against the simulation's startMonth;
 * `debtId` omitted routes it through the normal strategy priority instead. */
export interface LumpSum {
  month: number
  amount: number
  debtId?: string
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

export interface RecurringInputTransaction {
  type: 'income' | 'expense' | 'transfer'
  merchant: string
  date: string
  amount: number
}

export type Cadence = 'weekly' | 'biweekly' | 'monthly' | 'annual'

export interface RecurringSeries {
  payeeNorm: string
  displayName: string
  type: 'income' | 'expense'
  cadence: Cadence
  avgAmount: number
  lastAmount: number
  previousAmount: number | null
  priceIncreased: boolean
  lastDate: string
  nextExpected: string
  occurrences: number
}

export interface AccountLike {
  balance: number
  includeInNetWorth: boolean
  archived: boolean
}

export interface BudgetEntryLike {
  categoryId: string
  budgeted: number
}

export interface BudgetLike {
  entries: BudgetEntryLike[]
  expectedIncome: number
  savingsTarget: number
}

export interface GoalLike {
  targetAmount: number
  currentAmount: number
  targetDate: string
  monthlyContribution: number
}
