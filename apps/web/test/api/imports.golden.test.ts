import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import Papa from 'papaparse'
import { POST } from '@/app/api/imports/csv/route'
import { db } from '@/lib/db'

// PRD §12: "CSV import: golden-file tests with real (sanitized) Chase/Amex/
// Discover exports." Fixtures under test/fixtures/*.csv match each issuer's
// actual column layout and — critically — actual amount-sign convention:
// Chase checking exports a debit as negative; Amex and Discover (credit
// cards) export a charge as positive, the opposite. Golden-file testing
// against real formats is what caught that the import wizard didn't
// account for this (see app/app/transactions/import/page.tsx's
// isCreditCardAccount handling) — a synthetic single-format fixture never
// would have.

vi.mock('@/lib/session', () => ({ getRequiredSession: vi.fn(async () => ({ userId: 'user_test', plan: 'pro' })) }))
vi.mock('@/lib/rateLimit', () => ({ importRateLimit: {}, checkRateLimit: vi.fn(async () => true) }))

function loadFixture(name: string): Record<string, string>[] {
  const csv = readFileSync(path.resolve(__dirname, '../fixtures', name), 'utf8')
  return Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true }).data
}

/** Mirrors the import wizard's own sign normalization (buildRows() in
 * app/app/transactions/import/page.tsx) so these tests exercise the same
 * negative=expense wire convention the real API always receives from the
 * real client, rather than raw bank-native rows. */
function normalize(rows: Record<string, string>[], amountCol: string, descCol: string, isCreditCard: boolean) {
  return rows.map((r) => {
    const raw = r[amountCol].trim()
    const negative = /^-|^\(.*\)$/.test(raw.replace(/[$,\s]/g, ''))
    const isExpense = isCreditCard ? !negative : negative
    const amount = Math.abs(parseFloat(raw.replace(/[$,()]/g, '')))
    return { date: r['Date'] ?? r['Posting Date'] ?? r['Trans. Date'], amount: String(isExpense ? -amount : amount), merchant: r[descCol], notes: '' }
  })
}

let accountId: string

beforeEach(async () => {
  await db.user.upsert({ where: { id: 'user_test' }, update: {}, create: { id: 'user_test', email: 'golden@example.com' } })
  await db.transaction.deleteMany({ where: { userId: 'user_test' } })
  await db.financialAccount.deleteMany({ where: { userId: 'user_test' } })
})

const mapping = { date: 'date', amount: 'amount', payee: 'merchant', notes: 'notes' }

describe('golden CSV: Chase checking export', () => {
  it('imports all 5 rows with debits as expenses and the payroll deposit as income', async () => {
    const acc = await db.financialAccount.create({ data: { userId: 'user_test', name: 'Chase Checking', institution: 'Chase', type: 'checking', balance: 0 } })
    accountId = acc.id
    const rows = normalize(loadFixture('chase-checking.csv'), 'Amount', 'Description', false)

    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ accountId, rows, mapping, dateFormat: 'MM/dd/yyyy' }) }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.imported).toBe(5)

    const txns = await db.transaction.findMany({ where: { userId: 'user_test' } })
    const payroll = txns.find((t) => t.merchant.includes('PAYROLL'))
    const starbucks = txns.find((t) => t.merchant.includes('STARBUCKS'))
    expect(payroll?.type).toBe('income')
    expect(starbucks?.type).toBe('expense')
    expect(Number(starbucks?.amount)).toBe(6.75)
  })
})

describe('golden CSV: Amex export (credit card — positive = charge)', () => {
  it('treats positive charges as expenses and the payment as income, not the other way around', async () => {
    const acc = await db.financialAccount.create({ data: { userId: 'user_test', name: 'Amex', institution: 'American Express', type: 'credit_card', balance: 0 } })
    accountId = acc.id
    const rows = normalize(loadFixture('amex.csv'), 'Amount', 'Description', true)

    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ accountId, rows, mapping, dateFormat: 'MM/dd/yyyy' }) }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.imported).toBe(4)

    const txns = await db.transaction.findMany({ where: { userId: 'user_test' } })
    const netflix = txns.find((t) => t.merchant.includes('NETFLIX'))
    const payment = txns.find((t) => t.merchant.includes('ONLINE PAYMENT'))
    expect(netflix?.type).toBe('expense')
    expect(Number(netflix?.amount)).toBe(15.49)
    expect(payment?.type).toBe('income')
  })
})

describe('golden CSV: Discover export (credit card — positive = charge)', () => {
  it('treats positive charges as expenses and the payment as income', async () => {
    const acc = await db.financialAccount.create({ data: { userId: 'user_test', name: 'Discover', institution: 'Discover', type: 'credit_card', balance: 0 } })
    accountId = acc.id
    const rows = normalize(loadFixture('discover.csv'), 'Amount', 'Description', true)

    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ accountId, rows, mapping, dateFormat: 'MM/dd/yyyy' }) }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.imported).toBe(4)

    const txns = await db.transaction.findMany({ where: { userId: 'user_test' } })
    const uber = txns.find((t) => t.merchant.includes('UBER'))
    const payment = txns.find((t) => t.merchant.includes('INTERNET PAYMENT'))
    expect(uber?.type).toBe('expense')
    expect(Number(uber?.amount)).toBe(18.42)
    expect(payment?.type).toBe('income')
  })
})
