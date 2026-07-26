// ─── Car financing calculations ──────────────────────────────────────────────
import { round2 } from '../format'
import { buildAmortization, calculateLoan, monthlyPayment } from './loans'
import type { CarLoanResult } from '@/types'

export interface CarLoanInputs {
  vehiclePrice: number
  downPayment: number
  tradeInValue: number
  tradeInOwed: number
  rebate: number
  taxRate: number // percent
  docFee: number
  registrationFee: number
  destinationFee: number
  dealerFees: number
  apr: number
  termMonths: number
  startDate: string
  extraMonthly: number
  oneTimePayment: number
}

export function calculateCarLoan(i: CarLoanInputs): CarLoanResult {
  const netTradeIn = round2(i.tradeInValue - i.tradeInOwed)
  const negativeEquity = round2(Math.max(0, i.tradeInOwed - i.tradeInValue))
  // Taxable amount: price minus positive trade-in equity minus rebates (typical US rule)
  const taxableAmount = round2(Math.max(0, i.vehiclePrice - Math.max(0, netTradeIn) - i.rebate))
  const taxes = round2((taxableAmount * i.taxRate) / 100)
  const totalFees = round2(i.docFee + i.registrationFee + i.destinationFee + i.dealerFees)
  const totalPrice = round2(i.vehiclePrice + taxes + totalFees)
  // Amount financed: total price minus down payment, minus positive trade equity, minus rebate, plus negative equity rolled in
  const amountFinanced = round2(Math.max(0, totalPrice - i.downPayment - Math.max(0, netTradeIn) - i.rebate + negativeEquity))
  const cashDueAtSigning = round2(Math.max(0, i.downPayment))

  const standardMonthlyPayment = monthlyPayment(amountFinanced, i.apr, i.termMonths)
  const result = calculateLoan({
    principal: amountFinanced,
    apr: i.apr,
    termMonths: i.termMonths,
    startDate: i.startDate,
    extraMonthly: i.extraMonthly,
    oneTimePayment: i.oneTimePayment,
  })

  const totalLoanPayments = result.totalPaid
  return {
    ...result,
    netTradeIn,
    negativeEquity,
    taxableAmount,
    taxes,
    totalFees,
    cashDueAtSigning,
    amountFinanced,
    totalVehicleCost: round2(cashDueAtSigning + totalLoanPayments),
    standardMonthlyPayment,
  }
}

export interface AffordabilityInputs {
  grossIncome: number
  netIncome: number
  existingDebtPayments: number
  insurance: number
  fuel: number
  maintenance: number
  parkingTolls: number
}

export interface AffordabilityResult {
  paymentPctOfNet: number
  totalTransportCost: number
  dti: number
  remainingCash: number
  status: 'comfortable' | 'manageable' | 'high' | 'very_high'
  statusLabel: string
}

export function calculateAffordability(payment: number, i: AffordabilityInputs): AffordabilityResult {
  const totalTransportCost = round2(payment + i.insurance + i.fuel + i.maintenance + i.parkingTolls)
  const paymentPctOfNet = i.netIncome > 0 ? (payment / i.netIncome) * 100 : 0
  const dti = i.grossIncome > 0 ? ((i.existingDebtPayments + payment) / i.grossIncome) * 100 : 0
  const remainingCash = round2(i.netIncome - i.existingDebtPayments - totalTransportCost)
  const transportPct = i.netIncome > 0 ? (totalTransportCost / i.netIncome) * 100 : 100
  let status: AffordabilityResult['status'] = 'comfortable'
  if (transportPct > 25 || dti > 43) status = 'very_high'
  else if (transportPct > 20 || dti > 36) status = 'high'
  else if (transportPct > 15 || dti > 28) status = 'manageable'
  const labels = { comfortable: 'Comfortable', manageable: 'Manageable', high: 'High', very_high: 'Very high' }
  return { paymentPctOfNet, totalTransportCost, dti, remainingCash, status, statusLabel: labels[status] }
}

/** Re-export for convenience */
export { buildAmortization }
