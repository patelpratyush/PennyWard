import type { AccountType as PlaidAccountType } from 'plaid'
import type { AccountType } from '@prisma/client'

/** Maps Plaid's type/subtype to this app's AccountType enum. */
export function mapPlaidAccountType(type: PlaidAccountType | string, subtype: string | null): AccountType {
  if (type === 'depository') {
    if (subtype === 'savings') return 'savings'
    return 'checking'
  }
  if (type === 'credit') return 'credit_card'
  if (type === 'loan') {
    if (subtype === 'student') return 'student_loan'
    if (subtype === 'mortgage') return 'mortgage'
    if (subtype === 'auto') return 'auto_loan'
    return 'personal_loan'
  }
  if (type === 'investment' || type === 'brokerage') return 'investment'
  return 'other'
}

/** Plaid's `balances.current` is a magnitude (positive = owed for credit/
 * loan accounts); this app stores liabilities as a negative balance
 * (see the `Account.balance` doc comment in types/index.ts). Flip sign for
 * the liability account types, pass through as-is for asset types. */
export function plaidBalanceToAppBalance(current: number, accountType: AccountType): number {
  const isLiability = accountType === 'credit_card' || accountType === 'auto_loan'
    || accountType === 'student_loan' || accountType === 'mortgage' || accountType === 'personal_loan'
  return isLiability ? -Math.abs(current) : current
}
