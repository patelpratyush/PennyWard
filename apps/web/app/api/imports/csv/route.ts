import { NextResponse } from 'next/server'
import { z } from 'zod'
import { parse, isValid } from 'date-fns'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { normalizePayee } from '@/lib/payeeNormalize'
import { importHash } from '@/lib/importHash'
import { round2 } from '@/lib/format'
import { importRateLimit, checkRateLimit } from '@/lib/rateLimit'
import { PLAN_LIMITS, upgradeRequired } from '@/lib/plan'
import { markOnboardingStep } from '@/lib/onboarding'

const schema = z.object({
  accountId: z.string(),
  rows: z.array(z.record(z.string(), z.string())).min(1).max(5000),
  mapping: z.object({ date: z.string(), amount: z.string(), payee: z.string(), notes: z.string().optional() }),
  dateFormat: z.string().default('MM/dd/yyyy'),
})

export const POST = withAuthErrorHandling(async (req: Request) => {
  const { userId, plan } = await getRequiredSession()
  if (!PLAN_LIMITS[plan].csvImport) {
    return NextResponse.json(
      upgradeRequired('CSV import is a Pro feature. Upgrade to import transactions in bulk.'),
      { status: 403 },
    )
  }

  const success = await checkRateLimit(importRateLimit, userId)
  if (!success) return NextResponse.json({ error: 'Too many attempts, try again later' }, { status: 429 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { accountId, rows, mapping, dateFormat } = parsed.data

  const account = await db.financialAccount.findFirst({ where: { id: accountId, userId } })
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const rules = await db.categorizationRule.findMany({ where: { userId }, orderBy: { priority: 'desc' } })

  let imported = 0
  let duplicates = 0
  const review: string[] = []

  for (const row of rows) {
    const rawDate = row[mapping.date]
    const rawAmount = row[mapping.amount]
    const rawPayee = row[mapping.payee]
    if (!rawDate || !rawAmount || !rawPayee) { review.push(`Skipped incomplete row: ${JSON.stringify(row)}`); continue }

    const parsedDate = parse(rawDate, dateFormat, new Date())
    if (!isValid(parsedDate)) { review.push(`Unparseable date: ${rawDate}`); continue }

    // Real bank exports commonly wrap negatives in parens and thousands-separate
    // with commas (`$1,234.56`, `(45.00)`) — strip formatting before parsing,
    // and never let a malformed cell throw mid-loop after earlier rows already
    // committed.
    const cleanedAmount = rawAmount.trim().replace(/[$,\s]/g, '')
    const isParenNegative = /^\(.*\)$/.test(cleanedAmount)
    const numericAmount = parseFloat(isParenNegative ? cleanedAmount.slice(1, -1) : cleanedAmount)
    if (!Number.isFinite(numericAmount)) { review.push(`Unparseable amount: ${rawAmount}`); continue }

    const amount = round2(Math.abs(numericAmount))
    const type = (isParenNegative || numericAmount < 0) ? 'expense' : 'income'
    const payeeNorm = normalizePayee(rawPayee)
    const dateStr = parsedDate.toISOString().slice(0, 10)
    const hash = importHash(accountId, dateStr, amount, payeeNorm)

    const dup = await db.transaction.findUnique({ where: { userId_importHash: { userId, importHash: hash } } })
    if (dup) { duplicates++; continue }

    // A rule's regex pattern is only validated at save time going forward
    // (lib/validation/rules.ts) — this guards against any already-saved rows
    // from before that check existed, so one bad pattern can't 500 the import.
    let matchedRule: (typeof rules)[number] | undefined
    try {
      matchedRule = rules.find((r) =>
        r.matchType === 'contains' ? payeeNorm.includes(r.pattern.toLowerCase()) :
        r.matchType === 'equals' ? payeeNorm === r.pattern.toLowerCase() :
        new RegExp(r.pattern, 'i').test(payeeNorm))
    } catch {
      matchedRule = undefined
    }

    await db.transaction.create({
      data: {
        userId, accountId, type, amount, merchant: rawPayee, date: parsedDate,
        notes: mapping.notes != null ? (row[mapping.notes] ?? undefined) : undefined,
        source: 'csv', importHash: hash, categoryId: matchedRule?.categoryId,
      },
    })
    imported++
  }

  if (imported > 0) await markOnboardingStep(userId, 'transaction')
  return NextResponse.json({ imported, duplicates, review })
})
