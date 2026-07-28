import { describe, it, expect } from 'vitest'
import { normalizePayee } from '@/lib/payeeNormalize'

describe('normalizePayee', () => {
  it('strips SQ * prefix and phone/state suffix', () => {
    expect(normalizePayee('SQ *BLUE BOTTLE COF 4155551234 CA')).toBe('blue bottle cof')
  })
  it('strips TST* prefix', () => {
    expect(normalizePayee('TST* Olive Garden 0123')).toBe('olive garden')
  })
  it('strips PAYPAL * prefix', () => {
    expect(normalizePayee('PAYPAL *NETFLIX')).toBe('netflix')
  })
  it('collapses whitespace and lowercases', () => {
    expect(normalizePayee('  Whole   Foods   Market  ')).toBe('whole foods market')
  })
})
