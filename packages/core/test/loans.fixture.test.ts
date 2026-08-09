import { describe, it, expect } from 'vitest'
import { calculateLoan } from '../src/loans'
import fixtures from './fixtures/loan-scenarios.json'

describe('calculateLoan — spreadsheet-equivalent fixtures (PRD §12)', () => {
  for (const scenario of fixtures.scenarios) {
    it(`matches the hand-verified schedule for "${scenario.name}" to the penny`, () => {
      const result = calculateLoan(scenario.input)
      if (scenario.expected.monthlyPayment != null) {
        expect(result.monthlyPayment).toBe(scenario.expected.monthlyPayment)
      }
      expect(result.totalInterest).toBe(scenario.expected.totalInterest)
      expect(result.totalPaid).toBe(scenario.expected.totalPaid)
      expect(result.months).toBe(scenario.expected.months)
    })
  }
})
